"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export function PayButton({ requestId, label }: { requestId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <button
        className="btn"
        aria-busy={busy} disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await api<{ redirectTo: string }>("/api/payments", { body: { requestId } });
            router.push(res.redirectTo);
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? "Please wait…" : label}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <p className="text-xs text-muted">Safe to retry. You will never be charged twice.</p>
    </div>
  );
}
