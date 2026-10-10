"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { WordCount } from "@/components/word-count";
import { PdfUpload } from "@/components/pdf-upload";
import type { Uploaded } from "@/lib/upload-client";

export type AuthorityOption = { id: string; code: string; name: string; ministry: string };

const STEPS = ["Authority", "Your request", "Review"] as const;

export function FilingWizard({ authorities }: { authorities: AuthorityOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [authorityId, setAuthorityId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<Uploaded | null>(null);
  const [bpl, setBpl] = useState(false);
  const [bplCertificate, setBplCertificate] = useState<Uploaded | null>(null);
  const [lifeLiberty, setLifeLiberty] = useState(false);
  const [lifeLibertyReason, setLifeLibertyReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const authority = authorities.find((a) => a.id === authorityId) ?? null;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return authorities;
    return authorities.filter((a) => `${a.name} ${a.ministry} ${a.code}`.toLowerCase().includes(q));
  }, [authorities, query]);

  const stepValid = [
    Boolean(authorityId),
    subject.trim().length > 0 &&
      body.trim().length > 0 &&
      (!bpl || bplCertificate) &&
      (!lifeLiberty || lifeLibertyReason.trim().length > 0),
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

      {step === 0 && (
        <section className="card grid gap-4">
          <h2 className="text-lg font-bold">Which public authority holds the information?</h2>
          <input
            className="input"
            placeholder="Search by ministry or department"
            aria-label="Search authorities"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="grid gap-2" role="radiogroup" aria-label="Public authority">
            {matches.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${authorityId === a.id ? "border-accent bg-accent/5" : "border-line"}`}
              >
                <input
                  type="radio"
                  name="authority"
                  className="mt-1"
                  checked={authorityId === a.id}
                  onChange={() => setAuthorityId(a.id)}
                />
                <span className="grid">
                  <span className="font-semibold">{a.name}</span>
                  <span className="text-xs text-muted">{a.ministry}</span>
                </span>
              </label>
            ))}
            {matches.length === 0 && <p className="text-sm text-muted">No central authority matches that search.</p>}
          </div>
          <p className="text-xs text-muted">
            This portal covers central government authorities only. Requests to state government
            offices must be filed with the state.
          </p>
        </section>
      )}

      {step === 1 && (
        <section className="card grid gap-4">
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
            <textarea
              id="body"
              className="input min-h-48"
              maxLength={20_000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write in English, Hindi or any Indian language. Mention dates, file numbers and the exact records you want."
            />
            <WordCount text={body} />
          </div>
          <PdfUpload label="Supporting document" kind="attachment" value={attachment} onChange={setAttachment} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={bpl} onChange={(e) => setBpl(e.target.checked)} />
            <span>I am below the poverty line (no fee, certificate required)</span>
          </label>
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
          <button className="btn" disabled={busy} onClick={submit}>
            {busy ? "Saving…" : bpl ? "File request" : "Continue to payment"}
          </button>
        )}
      </div>
    </div>
  );
}
