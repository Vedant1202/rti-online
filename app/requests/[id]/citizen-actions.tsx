import Link from "next/link";
import type { CaseView } from "@/lib/services/views";
import { formatRupees } from "@/lib/rti/fees";
import { UploadRequested } from "./upload-requested";

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
    const open = view.demands.find((d) => !d.paidAt);
    return (
      <div className="grid gap-3" data-testid="fee-breakdown">
        <p className="font-semibold">The CPIO asked for an additional fee</p>
        {open && (
          <table className="w-full max-w-md text-sm">
            <tbody>
              {open.items.map((i) => (
                <tr key={i.label} className="border-b border-line">
                  <td className="py-1">{i.label}</td>
                  <td className="py-1 text-right tabular-nums">
                    {i.quantity} × {formatRupees(i.unitPaise)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-1 font-semibold">Total</td>
                <td className="py-1 text-right font-semibold tabular-nums">{formatRupees(open.totalPaise)}</td>
              </tr>
            </tbody>
          </table>
        )}
        <Link href={`/requests/${current.id}/pay`} className="btn w-fit">
          Pay {open ? formatRupees(open.totalPaise) : "fee"}
        </Link>
      </div>
    );
  }
  if (current.status === "documents_requested") {
    const ask = [...view.timeline].reverse().find((e) => e.type === "documents_requested");
    return <UploadRequested requestId={current.id} note={String(ask?.payload.note ?? "")} />;
  }
  return null;
}
