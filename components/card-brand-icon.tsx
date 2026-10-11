import { CreditCard } from "lucide-react";
import type { Brand } from "@/lib/card";

/** Simple brand marks (not the official artwork), sized like a card chip. */
export function CardBrandIcon({ brand, className = "" }: { brand: Brand | null; className?: string }) {
  const box = `inline-flex h-6 w-9 shrink-0 items-center justify-center rounded border border-line bg-white ${className}`;
  switch (brand) {
    case "visa":
      return (
        <span className={box} data-testid="card-brand" data-brand="visa" aria-label="Visa">
          <svg viewBox="0 0 36 12" width="28" height="10" aria-hidden="true">
            <text x="18" y="10.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontStyle="italic" fontSize="12" fill="#1a1f71">VISA</text>
          </svg>
        </span>
      );
    case "mastercard":
      return (
        <span className={box} data-testid="card-brand" data-brand="mastercard" aria-label="Mastercard">
          <svg viewBox="0 0 24 16" width="22" height="15" aria-hidden="true">
            <circle cx="9" cy="8" r="6" fill="#eb001b" />
            <circle cx="15" cy="8" r="6" fill="#f79e1b" fillOpacity="0.9" />
          </svg>
        </span>
      );
    case "amex":
      return (
        <span className={`${box} !bg-[#2e77bb]`} data-testid="card-brand" data-brand="amex" aria-label="American Express">
          <svg viewBox="0 0 36 12" width="28" height="10" aria-hidden="true">
            <text x="18" y="9.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="9" fill="#ffffff">AMEX</text>
          </svg>
        </span>
      );
    case "rupay":
      return (
        <span className={box} data-testid="card-brand" data-brand="rupay" aria-label="RuPay">
          <svg viewBox="0 0 40 12" width="30" height="10" aria-hidden="true">
            <text x="0" y="10" fontFamily="Arial, sans-serif" fontWeight="900" fontStyle="italic" fontSize="10.5">
              <tspan fill="#1b3f8b">Ru</tspan>
              <tspan fill="#f37021">Pay</tspan>
            </text>
          </svg>
        </span>
      );
    default:
      return (
        <span className="inline-flex text-muted" data-testid="card-brand" data-brand="unknown" aria-hidden="true">
          <CreditCard size={20} />
        </span>
      );
  }
}
