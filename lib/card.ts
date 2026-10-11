/**
 * Card checks that run in the browser. Card numbers and CVCs never leave the page:
 * the server only ever receives the brand and the last 4 digits.
 */
import { formatRupees } from "@/lib/rti/fees";

export type Brand = "visa" | "mastercard" | "amex" | "rupay";
export type CardSummary = { brand: Brand; last4: string };

export const BRAND_NAME: Record<Brand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  rupay: "RuPay",
};

const RULES: Record<Brand, { lengths: number[]; cvc: number; groups: number[] }> = {
  visa: { lengths: [13, 16, 19], cvc: 3, groups: [4, 4, 4, 4, 3] },
  mastercard: { lengths: [16], cvc: 3, groups: [4, 4, 4, 4] },
  amex: { lengths: [15], cvc: 4, groups: [4, 6, 5] },
  rupay: { lengths: [16], cvc: 3, groups: [4, 4, 4, 4] },
};

export const digitsOnly = (s: string) => s.replace(/\D/g, "");

/** The brand, as soon as the first digits identify it. */
export function detectBrand(number: string): Brand | null {
  const d = digitsOnly(number);
  if (/^4/.test(d)) return "visa";
  if (/^3[47]/.test(d)) return "amex";
  if (/^5[1-5]/.test(d)) return "mastercard";
  if (d.length >= 4) {
    const four = Number(d.slice(0, 4));
    if (four >= 2221 && four <= 2720) return "mastercard";
  }
  if (/^(60|65|81|82|508)/.test(d)) return "rupay";
  return null;
}

export function formatCardNumber(input: string): string {
  const brand = detectBrand(input);
  const rules = RULES[brand ?? "visa"];
  const max = Math.max(...rules.lengths);
  const d = digitsOnly(input).slice(0, max);
  const parts: string[] = [];
  let i = 0;
  for (const size of rules.groups) {
    if (i >= d.length) break;
    parts.push(d.slice(i, i + size));
    i += size;
  }
  return parts.join(" ");
}

/** Formats MM/YY while typing; a first digit above 1 becomes 0X. */
export function formatExpiry(input: string): string {
  let d = digitsOnly(input).slice(0, 4);
  if (d.length === 1 && Number(d) > 1) d = `0${d}`;
  if (d.length >= 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

export function luhnValid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return digits.length > 0 && sum % 10 === 0;
}

export type CardInput = { number: string; expiry: string; cvc: string; name: string };
export type CardErrors = Partial<Record<keyof CardInput, string>>;

export function validateCard(card: CardInput, now: Date) {
  const errors: CardErrors = {};
  const digits = digitsOnly(card.number);
  const brand = detectBrand(digits);

  if (!digits) errors.number = "Enter your card number.";
  else if (!brand) errors.number = "We accept Visa, Mastercard, RuPay and American Express.";
  else if (!RULES[brand].lengths.includes(digits.length)) errors.number = "Your card number is incomplete.";
  else if (!luhnValid(digits)) errors.number = "Your card number isn't valid. Check it and try again.";

  const m = /^(\d{2})\/(\d{2})$/.exec(card.expiry.trim());
  if (!m) errors.expiry = "Enter the expiry date as MM/YY.";
  else {
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    const thisYear = now.getUTCFullYear();
    const thisMonth = now.getUTCMonth() + 1;
    if (month < 1 || month > 12) errors.expiry = "The expiry month must be 01 to 12.";
    else if (year < thisYear || (year === thisYear && month < thisMonth)) errors.expiry = "Your card has expired.";
    else if (year > thisYear + 20) errors.expiry = "The expiry year is too far in the future.";
  }

  const cvcLength = RULES[brand ?? "visa"].cvc;
  if (!new RegExp(`^\\d{${cvcLength}}$`).test(card.cvc.trim())) {
    errors.cvc = `Enter the ${cvcLength} digits on the ${brand === "amex" ? "front" : "back"} of your card.`;
  }
  if (!card.name.trim()) errors.name = "Enter the name on the card.";

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    brand,
    last4: digits.length >= 4 ? digits.slice(-4) : "",
  };
}

/** This number always gets "Your card was declined", to show the failure path. */
export const DECLINE_NUMBER = "4000000000000002";
export const isDeclined = (number: string) => digitsOnly(number) === DECLINE_NUMBER;

/** Two saved cards for quick filling. Network-published test numbers; nothing is ever charged. */
export const SAVED_CARDS: (CardInput & { id: string })[] = [
  { id: "visa-4242", number: "4242 4242 4242 4242", expiry: "12/30", cvc: "123", name: "Asha Sharma" },
  { id: "mc-4444", number: "5555 5555 5555 4444", expiry: "08/29", cvc: "456", name: "Ravi Kumar" },
];

/** "Paid ₹10 with Visa •••• 4242.", or just "Paid ₹10." when no card is known. */
export function paidLine(amountPaise: number, card: CardSummary | null | undefined): string {
  const amount = formatRupees(amountPaise);
  return card ? `Paid ${amount} with ${BRAND_NAME[card.brand]} •••• ${card.last4}.` : `Paid ${amount}.`;
}
