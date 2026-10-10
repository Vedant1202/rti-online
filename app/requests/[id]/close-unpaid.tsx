"use client";

import { ErrorText, useAction } from "@/components/use-action";

export function CloseUnpaidButton({ requestId, disabled }: { requestId: string; disabled: boolean }) {
  const { run, busy, error } = useAction();
  return (
    <div className="grid gap-2">
      <button className="btn-ghost w-fit" disabled={disabled || busy} onClick={() => run(`/api/requests/${requestId}/close-unpaid`, {})}>
        Close request (fee unpaid)
      </button>
      <ErrorText error={error} />
    </div>
  );
}
