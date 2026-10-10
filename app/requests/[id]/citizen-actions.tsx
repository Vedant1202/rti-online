import Link from "next/link";
import type { CaseView } from "@/lib/services/views";

/** What the citizen can do next on this request. Later tasks add document upload and appeals. */
export function CitizenActions({ view }: { view: CaseView; now: string }) {
  const { current } = view;
  if (current.status === "pending_payment") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">This request isn&apos;t filed until the fee is paid.</p>
        <Link href={`/requests/${current.id}/pay`} className="btn">
          {current.bpl ? "File request" : "Pay ₹10"}
        </Link>
      </div>
    );
  }
  if (current.status === "fee_requested") {
    return (
      <Link href={`/requests/${current.id}/pay`} className="btn w-fit">
        Pay additional fee
      </Link>
    );
  }
  return null;
}
