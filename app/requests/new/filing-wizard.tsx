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

export type { AuthorityOption };

const STEPS = ["Your request", "Authority", "Review"] as const;

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
  const [step, setStep] = useState(0);
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
  const recommendation = useRecommendation(aiEnabled && step === 1, subject, body);
  const recommended = authorities.find((a) => a.id === recommendation.result?.authorityId) ?? null;

  const stepValid = [
    subject.trim().length > 0 &&
      body.trim().length > 0 &&
      placeholders.length === 0 &&
      (!bpl || bplCertificate) &&
      (!lifeLiberty || lifeLibertyReason.trim().length > 0),
    Boolean(authorityId),
    true,
  ][step];

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/requests", {
        body: {
          authorityId,
          subject,
          body,
          bpl,
          attachmentId: attachment?.id,
          bplCertificateId: bpl ? bplCertificate?.id : undefined,
          lifeLibertyReason: lifeLiberty ? lifeLibertyReason : undefined,
        },
      });
      router.push(`/requests/${id}/pay`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <p className="text-xs text-muted" aria-live="polite" data-testid="draft-status">
        {savedAt
          ? `Draft saved at ${savedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
          : draft
            ? "Restored your saved draft."
            : "Your draft saves automatically."}
      </p>
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={`rounded-full border px-3 py-1 ${i === step ? "border-accent text-accent" : "border-line text-muted"}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
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
      )}

      {step === 0 && (
        <section className="card grid gap-4">
          <div className="grid gap-2">
            <p className="label">Start from a template</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent"
                  onClick={() => {
                    setSubject(t.subject);
                    setBody(t.body);
                  }}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1">
            <label htmlFor="subject" className="label">
              Subject
            </label>
            <input
              id="subject"
              className="input"
              maxLength={150}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Status of my pension file"
            />
          </div>
          <div className="grid gap-1">
            <label htmlFor="body" className="label">
              What information do you want?
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
                placeholder="Write in English, Hindi or any Indian language. Mention dates, file numbers and the exact records you want."
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
                Replace these with your details: {placeholders.join(", ")}
              </p>
            )}
          </div>
          <PdfUpload label="Supporting document" kind="attachment" value={attachment} onChange={setAttachment} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={bpl} onChange={(e) => setBpl(e.target.checked)} />
            <span>I am below the poverty line (no fee, certificate required)</span>
          </label>
          <span className="-mt-3 ml-6">
            <HelpTip topic="bpl" />
          </span>
          {bpl && (
            <PdfUpload
              label="BPL certificate"
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
            <span>This concerns someone&apos;s life or liberty (48-hour reply)</span>
          </label>
          <span className="-mt-3 ml-6">
            <HelpTip topic="lifeLiberty" />
          </span>
          {lifeLiberty && (
            <div className="grid gap-1">
              <label htmlFor="ll-reason" className="label">
                Why does this concern life or liberty?
              </label>
              <textarea
                id="ll-reason"
                className="input min-h-24"
                value={lifeLibertyReason}
                onChange={(e) => setLifeLibertyReason(e.target.value)}
              />
              <p className="text-xs text-muted">
                The officer decides whether the 48-hour limit applies. Without a clear reason, the
                normal 30 days apply.
              </p>
            </div>
          )}
        </section>
      )}

      {step === 2 && authority && (
        <section className="card grid gap-3">
          {stateTerm && <StateWarning term={stateTerm} />}
          <h2 className="text-lg font-bold">Check your request</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted">Authority</dt>
            <dd>{authority.name}</dd>
            <dt className="text-muted">Subject</dt>
            <dd>{subject}</dd>
            <dt className="text-muted">Request</dt>
            <dd className="whitespace-pre-wrap">{body}</dd>
            <dt className="text-muted">Attachment</dt>
            <dd>{attachment?.filename ?? "None"}</dd>
            <dt className="text-muted">Fee</dt>
            <dd>{bpl ? "₹0 (below poverty line)" : "₹10"}</dd>
            {lifeLiberty && (
              <>
                <dt className="text-muted">Life or liberty</dt>
                <dd>Claimed: {lifeLibertyReason}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-between gap-3">
        <button className="btn-ghost" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn" disabled={!stepValid} onClick={() => setStep(step + 1)}>
            Continue
          </button>
        ) : (
          <button className="btn" aria-busy={busy} disabled={busy} onClick={submit}>
            {busy ? "Saving…" : bpl ? "File request" : "Continue to payment"}
          </button>
        )}
      </div>
    </div>
  );
}

function StateWarning({ term }: { term: string }) {
  return (
    <div role="note" className="rounded-md border border-warn bg-warn/10 px-3 py-2 text-sm text-warn" data-testid="state-warning">
      <p className="flex items-center gap-1 font-semibold">
        Is this about a state government office? <HelpTip topic="stateBodies" />
      </p>
      <p>
        Your request mentions &ldquo;{term}&rdquo;. This portal only reaches central government
        authorities. Requests meant for state bodies are returned, and the fee isn&apos;t refunded. You
        can still continue if the information is held by a central authority.
      </p>
    </div>
  );
}
