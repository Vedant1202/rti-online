"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export function GatewayActions({ checkoutId, cancelUrl }: { checkoutId: string; cancelUrl: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(outcome: "success" | "failure") {
    setBusy(true);
    try {
      const res = await api<{ returnUrl: string }>(`/api/payments/mock/${checkoutId}`, { body: { outcome } });
      router.push(res.returnUrl);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button className="btn bg-ok" aria-busy={busy} disabled={busy} onClick={() => decide("success")}>
        Simulate successful payment
      </button>
      <button className="btn bg-danger" aria-busy={busy} disabled={busy} onClick={() => decide("failure")}>
        Simulate failed payment
      </button>
      <button className="btn-ghost" aria-busy={busy} disabled={busy} onClick={() => router.push(cancelUrl)}>
        Cancel and go back
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
