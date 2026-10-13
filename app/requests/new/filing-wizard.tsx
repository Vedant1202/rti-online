"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { WordCount } from "@/components/word-count";
import { PdfUpload } from "@/components/pdf-upload";
import type { Uploaded } from "@/lib/upload-client";
import { suggestAuthorities } from "@/lib/rti/suggest-authority";
import { detectStateBody } from "@/lib/rti/state-body";
import { TEMPLATES, unfilledPlaceholders } from "@/lib/rti/templates";
import { RewritePanel } from "./rewrite-panel";
import { useRecommendation } from "./use-recommendation";
import { HelpTip } from "@/components/help-tip";
import { AuthorityPicker, type AuthorityOption } from "@/components/authority-picker";
import { RTI_FEE_PAISE } from "@/lib/contract";
import { formatRupees } from "@/lib/rti/fees";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

export type { AuthorityOption };

export type Draft = Partial<{
  subject: string;
  body: string;
  authorityId: string | null;
  attachment: Uploaded | null;
  bpl: boolean;
  bplCertificate: Uploaded | null;
  lifeLiberty: boolean;
  lifeLibertyReason: string;
}>;

export function FilingWizard({
  authorities,
  popular,
  draft,
  aiEnabled,
}: {
  authorities: AuthorityOption[];
  popular: { code: string; label: string }[];
  draft: Draft | null;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const { t } = useT();
  const steps = [t.filing.stepWrite, t.filing.stepReview];
  const [step, setStep] = useState(0);
  const createdId = useRef<string | null>(null);
  const [authorityId, setAuthorityId] = useState<string | null>(draft?.authorityId ?? null);
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [attachment, setAttachment] = useState<Uploaded | null>(draft?.attachment ?? null);
  const [bpl, setBpl] = useState(draft?.bpl ?? false);
  const [bplCertificate, setBplCertificate] = useState<Uploaded | null>(draft?.bplCertificate ?? null);
  const [lifeLiberty, setLifeLiberty] = useState(draft?.lifeLiberty ?? false);
  const [lifeLibertyReason, setLifeLibertyReason] = useState(draft?.lifeLibertyReason ?? "");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const firstRender = useRef(true);

  // Autosave: saves the draft to the account 1.5 s after the last change, so it resumes on any device.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const payload: Draft = { subject, body, authorityId, attachment, bpl, bplCertificate, lifeLiberty, lifeLibertyReason };
    const timer = setTimeout(async () => {
      const res = await fetch("/api/drafts", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload }),
      }).catch(() => null);
      if (res?.ok) setSavedAt(new Date());
    }, 1500);
    return () => clearTimeout(timer);
  }, [subject, body, authorityId, attachment, bpl, bplCertificate, lifeLiberty, lifeLibertyReason]);

  const placeholders = useMemo(() => unfilledPlaceholders(`${subject}\n${body}`), [subject, body]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const authority = authorities.find((a) => a.id === authorityId) ?? null;

  const suggestions = useMemo(() => suggestAuthorities(`${subject} ${body}`, authorities), [subject, body, authorities]);
  const stateTerm = useMemo(() => detectStateBody(`${subject} ${body}`), [subject, body]);
  const recommendation = useRecommendation(aiEnabled && step === 0, subject, body);
  const recommended = authorities.find((a) => a.id === recommendation.result?.authorityId) ?? null;

  const stepValid = [
    subject.trim().length > 0 && body.trim().length > 0 && placeholders.length === 0 && Boolean(authorityId),
    (!bpl || Boolean(bplCertificate)) && (!lifeLiberty || lifeLibertyReason.trim().length > 0),
  ][step];

  /** Creates the request, then goes straight to the card checkout (or files it, for BPL). */
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      // A retry after a failed checkout reuses the request that was already created.
      createdId.current ??= (
        await api<{ id: string }>("/api/requests", {
          body: {
            authorityId,
            subject,
            body,
            bpl,
            attachmentId: attachment?.id,
            bplCertificateId: bpl ? bplCertificate?.id : undefined,
            lifeLibertyReason: lifeLiberty ? lifeLibertyReason : undefined,
          },
        })
      ).id;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      return;
    }
    const id = createdId.current;
    try {
      const { redirectTo } = await api<{ redirectTo: string }>("/api/payments", { body: { requestId: id } });
      router.push(redirectTo);
    } catch {
      // The request is saved; the pay page lets the citizen try the payment again.
      router.push(`/requests/${id}/pay`);
    }
  }

  return (
    <div className="grid gap-6">
      <p className="text-xs text-muted" aria-live="polite" data-testid="draft-status">
        {savedAt
          ? fmt(t.filing.draftSaved, { time: savedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) })
          : draft
            ? t.filing.draftRestored
            : t.filing.draftAuto}
      </p>
      <ol className="flex flex-wrap gap-2 text-sm" aria-label={t.filing.steps}>
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={`rounded-full border px-3 py-1 ${i === step ? "border-accent font-semibold text-accent" : "border-line text-muted"}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <>
          <section className="card grid gap-4">
            <div className="grid gap-2">
              <p className="label">{t.filing.templates}</p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="chip"
                    onClick={() => {
                      setSubject(tpl.subject);
                      setBody(tpl.body);
                    }}
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1">
              <label htmlFor="subject" className="label">
                {t.filing.subject}
              </label>
              <input
                id="subject"
                className="input"
                maxLength={150}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t.filing.subjectPlaceholder}
              />
            </div>
            <div className="grid gap-1">
              <label htmlFor="body" className="label">
                {t.filing.body}
              </label>
              <div className="relative">
                <textarea
                  id="body"
                  className="input min-h-48"
                  maxLength={20_000}
                  value={body}
                  readOnly={rewriting}
                  aria-busy={rewriting}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t.filing.bodyPlaceholder}
                />
                {rewriting && <div className="skeleton pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />}
              </div>
              <div className="flex items-start gap-1">
                <WordCount text={body} />
                <HelpTip topic="wordLimit" align="right" />
              </div>
              {aiEnabled && <RewritePanel text={body} onReplace={setBody} onBusyChange={setRewriting} />}
              {placeholders.length > 0 && (
                <p className="text-sm text-warn" data-testid="placeholders">
                  {fmt(t.filing.placeholders, { list: placeholders.join(", ") })}
                </p>
              )}
            </div>
            <PdfUpload label={t.filing.attachment} kind="attachment" value={attachment} onChange={setAttachment} />
          </section>

          <section className="card grid gap-4">
            {stateTerm && <StateWarning term={stateTerm} />}
            <AuthorityPicker
              authorities={authorities}
              popular={popular}
              value={authorityId}
              onChange={setAuthorityId}
              suggestions={suggestions}
              ai={{
                show: aiEnabled,
                loading: recommendation.loading,
                authority: recommended,
                reason: recommendation.result?.reason ?? null,
              }}
            />
          </section>
        </>
      )}

      {step === 1 && authority && (
        <>
          <section className="card grid gap-3">
            {stateTerm && <StateWarning term={stateTerm} />}
            <h2 className="text-lg font-bold">{t.filing.check}</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted">{t.filing.authority}</dt>
              <dd>{authority.name}</dd>
              <dt className="text-muted">{t.filing.subject}</dt>
              <dd>{subject}</dd>
              <dt className="text-muted">{t.filing.request}</dt>
              <dd className="whitespace-pre-wrap">{body}</dd>
              <dt className="text-muted">{t.filing.attachmentLabel}</dt>
              <dd>{attachment?.filename ?? t.filing.none}</dd>
              <dt className="text-muted">{t.filing.fee}</dt>
              <dd data-testid="review-fee">{bpl ? t.filing.feeBpl : formatRupees(RTI_FEE_PAISE)}</dd>
              {lifeLiberty && (
                <>
                  <dt className="text-muted">{t.filing.lifeLiberty}</dt>
                  <dd>{fmt(t.filing.claimed, { reason: lifeLibertyReason })}</dd>
                </>
              )}
            </dl>
          </section>

          <section className="card grid gap-4">
            <h2 className="text-lg font-bold">{t.filing.options}</h2>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={bpl} onChange={(e) => setBpl(e.target.checked)} />
              <span>{t.filing.bplLabel}</span>
            </label>
            <span className="-mt-3 ml-6">
              <HelpTip topic="bpl" />
            </span>
            {bpl && (
              <PdfUpload
                label={t.filing.bplCertificate}
                kind="bpl_certificate"
                value={bplCertificate}
                onChange={setBplCertificate}
                required
              />
            )}
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={lifeLiberty}
                onChange={(e) => setLifeLiberty(e.target.checked)}
              />
              <span>{t.filing.llLabel}</span>
            </label>
            <span className="-mt-3 ml-6">
              <HelpTip topic="lifeLiberty" />
            </span>
            {lifeLiberty && (
              <div className="grid gap-1">
                <label htmlFor="ll-reason" className="label">
                  {t.filing.llReason}
                </label>
                <textarea
                  id="ll-reason"
                  className="input min-h-24"
                  value={lifeLibertyReason}
                  onChange={(e) => setLifeLibertyReason(e.target.value)}
                />
                <p className="text-xs text-muted">{t.filing.llNote}</p>
              </div>
            )}
          </section>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-between gap-3">
        <button className="btn-ghost" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>
          {t.filing.back}
        </button>
        {step < steps.length - 1 ? (
          <button className="btn" disabled={!stepValid} onClick={() => setStep(step + 1)}>
            {t.filing.continue}
          </button>
        ) : (
          <button className="btn" aria-busy={busy} disabled={busy || !stepValid} onClick={submit}>
            {busy ? t.filing.saving : bpl ? t.filing.fileFree : fmt(t.filing.payAndFile, { amount: formatRupees(RTI_FEE_PAISE) })}
          </button>
        )}
      </div>
    </div>
  );
}

function StateWarning({ term }: { term: string }) {
  const { t } = useT();
  return (
    <div role="note" className="rounded-md border border-warn bg-warn/10 px-3 py-2 text-sm text-warn" data-testid="state-warning">
      <p className="flex items-center gap-1 font-semibold">
        {t.filing.stateTitle} <HelpTip topic="stateBodies" />
      </p>
      <p>{fmt(t.filing.stateText, { term })}</p>
    </div>
  );
}
