"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { t } = useT();
  const l = t.login;
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
      const res = await api<{ redirectTo: string }>("/api/auth/otp/verify", {
        body: { email, code },
      });
      router.push(next && next.startsWith("/") ? next : res.redirectTo);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid w-full max-w-md gap-4">
      {step === "email" ? (
        <form onSubmit={send} className="grid gap-3">
          <label className="label" htmlFor="email">
            {l.email}
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
          <p className="text-xs text-muted">{l.emailHint}</p>
          <button className="btn" aria-busy={busy} disabled={busy}>
            {busy ? l.sending : l.send}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="grid gap-3">
          <p className="text-sm">
            {l.sent.split("{email}")[0]}
            <strong>{email}</strong>
            {l.sent.split("{email}")[1]}
          </p>
          {devCode && (
            <p className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn" data-testid="dev-code">
              {l.demo.split("{code}")[0]}
              <strong className="font-mono">{devCode}</strong>
              {l.demo.split("{code}")[1]}
            </p>
          )}
          <label className="label" htmlFor="code">
            {l.code}
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
            {busy ? l.checking : l.verify}
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" className="text-accent" onClick={() => setStep("email")}>
              {l.otherEmail}
            </button>
            <button
              type="button"
              className="text-accent disabled:text-muted"
              aria-busy={busy}
              disabled={cooldown > 0 || busy}
              onClick={() => send()}
            >
              {cooldown > 0 ? fmt(l.resendIn, { n: cooldown }) : l.resend}
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
