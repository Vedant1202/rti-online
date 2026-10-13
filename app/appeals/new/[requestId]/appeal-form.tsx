"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { APPEAL_GROUNDS, APPEAL_GROUND_KEY, type AppealGround } from "@/lib/contract";
import { useT } from "@/lib/i18n/client";

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
  const { t } = useT();
  const a = t.appeal;
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
        <legend className="label mb-1">{a.ground}</legend>
        {APPEAL_GROUNDS.map((g) => (
          <label key={g} className="flex items-center gap-2 text-sm">
            <input type="radio" name="ground" checked={ground === g} onChange={() => setGround(g)} />
            {a.grounds[APPEAL_GROUND_KEY[g]]}
            {g === suggested && <span className="text-xs text-muted">{a.suggested}</span>}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-1">
        <label htmlFor="appeal-body" className="label">
          {a.body}
        </label>
        <textarea id="appeal-body" className="input min-h-32" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      {late && (
        <div className="grid gap-1">
          <label htmlFor="delay" className="label">
            {a.delay}
          </label>
          <textarea id="delay" className="input min-h-20" value={delayReason} onChange={(e) => setDelayReason(e.target.value)} />
          <p className="text-xs text-muted">{a.delayNote}</p>
        </div>
      )}
      <p className="text-sm text-muted">{a.noFee}</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button className="btn w-fit" aria-busy={busy} disabled={busy || !body.trim() || (late && !delayReason.trim())}>
        {busy ? a.filing : a.submit}
      </button>
    </form>
  );
}
