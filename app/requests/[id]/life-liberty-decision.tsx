"use client";

import { useState } from "react";
import { ErrorText, useAction } from "@/components/use-action";

export function LifeLibertyDecision({ requestId, claim }: { requestId: string; claim: string }) {
  const { run, busy, error } = useAction();
  const [reason, setReason] = useState("");
  return (
    <div className="grid gap-2 rounded-md border border-warn bg-warn/10 p-3" data-testid="life-liberty">
      <p className="text-sm font-semibold text-warn">The applicant says this concerns life or liberty</p>
      <p className="text-sm">&ldquo;{claim}&rdquo;</p>
      <label className="label" htmlFor="ll-decision">
        Your reason (recorded and shown to the applicant)
      </label>
      <textarea id="ll-decision" className="input min-h-16" value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button className="btn" disabled={busy || !reason.trim()} onClick={() => run(`/api/requests/${requestId}/life-liberty`, { accept: true, reason })}>
          Accept 48-hour limit
        </button>
        <button className="btn-ghost" disabled={busy || !reason.trim()} onClick={() => run(`/api/requests/${requestId}/life-liberty`, { accept: false, reason })}>
          Decline, keep 30 days
        </button>
      </div>
      <ErrorText error={error} />
    </div>
  );
}
