"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  function startCooldown() {
    setCooldown(30);
    const timer = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) clearInterval(timer);
        return s - 1;
      });
    }, 1000);
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ devCode?: string }>("/api/auth/otp/send", { body: { email } });
      setDevCode(res.devCode);
      setStep("code");
      startCooldown();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ redirectTo: string }>("/api/auth/otp/verify", { body: { email, code } });
      router.push(next && next.startsWith("/") ? next : res.redirectTo);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card grid max-w-md gap-4">
      {step === "email" ? (
        <form onSubmit={send} className="grid gap-3">
          <label className="label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-xs text-muted">We&apos;ll email you a 6-digit code. No password needed.</p>
          <button className="btn" aria-busy={busy} disabled={busy}>
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="grid gap-3">
          <p className="text-sm">
            We sent a code to <strong>{email}</strong>. It expires in 10 minutes.
          </p>
          {devCode && (
            <p className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn" data-testid="dev-code">
              Demo mode: your code is <strong className="font-mono">{devCode}</strong>
            </p>
          )}
          <label className="label" htmlFor="code">
            6-digit code
          </label>
          <input
            id="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            className="input font-mono tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button className="btn" aria-busy={busy} disabled={busy}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" className="text-accent" onClick={() => setStep("email")}>
              Use a different email
            </button>
            <button
              type="button"
              className="text-accent disabled:text-muted"
              aria-busy={busy} disabled={cooldown > 0 || busy}
              onClick={() => send()}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
