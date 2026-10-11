"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { APPEAL_GROUNDS, type AppealGround } from "@/lib/contract";

export function AppealForm({
  requestId,
  suggested,
  defaultBody,
  late,
}: {
  requestId: string;
  suggested: AppealGround;
  defaultBody: string;
  late: boolean;
}) {
  const router = useRouter();
  const [ground, setGround] = useState<AppealGround>(suggested);
  const [body, setBody] = useState(defaultBody);
  const [delayReason, setDelayReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ id: string }>("/api/appeals", {
        body: { requestId, ground, body, delayReason: late ? delayReason : undefined },
      });
      router.push(`/appeals/${res.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="label mb-1">Ground for appeal</legend>
        {APPEAL_GROUNDS.map((g) => (
          <label key={g} className="flex items-center gap-2 text-sm">
            <input type="radio" name="ground" checked={ground === g} onChange={() => setGround(g)} />
            {g}
            {g === suggested && <span className="text-xs text-muted">(suggested)</span>}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-1">
        <label htmlFor="appeal-body" className="label">
          Your appeal
        </label>
        <textarea id="appeal-body" className="input min-h-32" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      {late && (
        <div className="grid gap-1">
          <label htmlFor="delay" className="label">
            Reason for the delay
          </label>
          <textarea id="delay" className="input min-h-20" value={delayReason} onChange={(e) => setDelayReason(e.target.value)} />
          <p className="text-xs text-muted">
            The 30-day window has passed. The appellate authority can still admit the appeal if you
            show sufficient cause (RTI Act s.19(1)).
          </p>
        </div>
      )}
      <p className="text-sm text-muted">No fee is charged for a first appeal.</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button className="btn w-fit" aria-busy={busy} disabled={busy || !body.trim() || (late && !delayReason.trim())}>
        {busy ? "Filing…" : "Submit appeal"}
      </button>
    </form>
  );
}
