"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAnnounce } from "@/components/announcer";
import { CardBrandIcon } from "@/components/card-brand-icon";
import {
  BRAND_NAME,
  SAVED_CARDS,
  detectBrand,
  formatCardNumber,
  formatExpiry,
  isDeclined,
  validateCard,
  type CardErrors,
  type CardInput,
} from "@/lib/card";

const FIELDS: (keyof CardInput)[] = ["number", "expiry", "cvc", "name"];

export function CardForm({ checkoutId, amount }: { checkoutId: string; amount: string }) {
  const router = useRouter();
  const announce = useAnnounce();
  const [card, setCard] = useState<CardInput>({ number: "", expiry: "", cvc: "", name: "" });
  const [errors, setErrors] = useState<CardErrors>({});
  const [declined, setDeclined] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const numberRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);
  const cvcRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const brand = detectBrand(card.number);

  const set = (field: keyof CardInput, value: string) => {
    setCard((c) => ({ ...c, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setDeclined(null);
  };

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    const result = validateCard(card, new Date());
    if (!result.valid) {
      setErrors(result.errors);
      const first = FIELDS.find((f) => result.errors[f]);
      const target = { number: numberRef, expiry: expiryRef, cvc: cvcRef, name: nameRef }[first ?? "number"];
      target.current?.focus();
      announce(`Check your card details: ${Object.values(result.errors).join(" ")}`);
      return;
    }
    setBusy(true);
    setDeclined(null);
    if (isDeclined(card.number)) {
      // Declines are decided in the browser too; the card is never sent anywhere.
      await new Promise((r) => setTimeout(r, 900));
      setBusy(false);
      setDeclined("Your card was declined. Try another card.");
      return;
    }
    try {
      // Only the brand and the last 4 digits leave this page.
      const res = await api<{ returnUrl: string }>(`/api/payments/checkout/${checkoutId}`, {
        body: { brand: result.brand, last4: result.last4 },
      });
      announce("Payment successful.");
      router.push(res.returnUrl);
    } catch (err) {
      setDeclined((err as Error).message);
      setBusy(false);
    }
  }

  const inputClass = (field: keyof CardInput) =>
    `w-full bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted/70 focus:relative focus:z-10 focus:ring-2 focus:ring-accent ${errors[field] ? "ring-1 ring-danger" : ""}`;
  const describe = (field: keyof CardInput) => (errors[field] ? `${field}-error` : undefined);

  return (
    <form onSubmit={pay} noValidate className="grid gap-5">
      <h1 id="pay-heading" className="text-xl font-semibold">
        Pay with card
      </h1>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">Saved cards</legend>
        {SAVED_CARDS.map((c) => {
          const b = detectBrand(c.number)!;
          const last4 = c.number.slice(-4);
          const selected = card.number === c.number;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={selected}
              aria-label={`Use ${BRAND_NAME[b]} ending in ${last4}, ${c.name}, expires ${c.expiry}`}
              onClick={() => {
                setCard({ number: c.number, expiry: c.expiry, cvc: c.cvc, name: c.name });
                setErrors({});
                setDeclined(null);
              }}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${selected ? "border-accent bg-accent/5" : "border-line hover:border-muted"}`}
            >
              <CardBrandIcon brand={b} />
              <span className="grid flex-1">
                <span className="font-semibold">
                  {BRAND_NAME[b]} •••• {last4}
                </span>
                <span className="text-xs text-muted">
                  {c.name} · Expires {c.expiry}
                </span>
              </span>
              <span aria-hidden="true" className={`h-4 w-4 rounded-full border-2 ${selected ? "border-accent bg-accent" : "border-line"}`} />
            </button>
          );
        })}
      </fieldset>

      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" /> or enter card details <span className="h-px flex-1 bg-line" />
      </div>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold">Card information</legend>
        <div className="overflow-hidden rounded-lg border border-line shadow-sm">
          <div className="relative border-b border-line">
            <label htmlFor="cc-number" className="sr-only">
              Card number
            </label>
            <input
              id="cc-number"
              ref={numberRef}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 1234 1234 1234"
              className={`${inputClass("number")} pr-14`}
              value={card.number}
              aria-invalid={Boolean(errors.number)}
              aria-describedby={describe("number")}
              onChange={(e) => set("number", formatCardNumber(e.target.value))}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 z-20 -translate-y-1/2">
              <CardBrandIcon brand={brand} />
            </span>
          </div>
          <div className="grid grid-cols-2">
            <div className="border-r border-line">
              <label htmlFor="cc-exp" className="sr-only">
                Expiry (MM/YY)
              </label>
              <input
                id="cc-exp"
                ref={expiryRef}
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM / YY"
                className={inputClass("expiry")}
                value={card.expiry}
                aria-invalid={Boolean(errors.expiry)}
                aria-describedby={describe("expiry")}
                onChange={(e) =>
                  set("expiry", e.target.value.length < card.expiry.length ? e.target.value : formatExpiry(e.target.value))
                }
              />
            </div>
            <div>
              <label htmlFor="cc-cvc" className="sr-only">
                Security code (CVC)
              </label>
              <input
                id="cc-cvc"
                ref={cvcRef}
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder={brand === "amex" ? "CVC (4 digits)" : "CVC"}
                maxLength={4}
                className={inputClass("cvc")}
                value={card.cvc}
                aria-invalid={Boolean(errors.cvc)}
                aria-describedby={describe("cvc")}
                onChange={(e) => set("cvc", e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
        </div>
        {(["number", "expiry", "cvc"] as const).map(
          (f) =>
            errors[f] && (
              <p key={f} id={`${f}-error`} className="text-sm text-danger">
                {errors[f]}
              </p>
            ),
        )}
      </fieldset>

      <div className="grid gap-1.5">
        <label htmlFor="cc-name" className="text-sm font-semibold">
          Name on card
        </label>
        <input
          id="cc-name"
          ref={nameRef}
          autoComplete="cc-name"
          className={`${inputClass("name")} rounded-lg border border-line shadow-sm`}
          value={card.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describe("name")}
          onChange={(e) => set("name", e.target.value)}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-danger">
            {errors.name}
          </p>
        )}
      </div>

      {declined && (
        <p role="alert" className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {declined}
        </p>
      )}

      <button type="submit" className="btn w-full py-3 text-base" aria-busy={busy} disabled={busy}>
        {busy ? "Processing…" : `Pay ${amount}`}
      </button>

      <div className="grid gap-1 text-xs text-muted">
        <p className="flex items-center gap-1.5">
          <Lock size={14} aria-hidden="true" /> Your full card number and security code stay on this device.
        </p>
        <p className="flex items-center gap-1.5">
          <ShieldCheck size={14} aria-hidden="true" /> Only the card type and last 4 digits are kept for your receipt.
        </p>
      </div>
    </form>
  );
}
