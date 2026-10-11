import Link from "next/link";
import type { CaseView } from "@/lib/services/views";
import { formatRupees } from "@/lib/rti/fees";
import { formatDate } from "@/lib/format";
import { UploadRequested } from "./upload-requested";
import { HelpTip } from "@/components/help-tip";

/** What the citizen can do next on this request. Later tasks add document upload and appeals. */
export function CitizenActions({ view }: { view: CaseView; now: string }) {
  const { current } = view;
  const appealed = view.appeals.some((a) => a.parentId === current.id);
  const window = view.clocks.appeal;
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
        <p className="flex items-center gap-1 font-semibold">
          The CPIO asked for an additional fee <HelpTip topic="pausedClock" />
        </p>
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
  if (appealed || !window || view.parts.length > 0) return null;
  if (window.state === "not_yet") {
    return window.opensAt ? (
      <p className="text-sm text-muted" data-testid="appeal-opens">
        If there&apos;s no reply, you can file a first appeal from {formatDate(window.opensAt)}.
      </p>
    ) : null;
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href={`/appeals/new/${current.id}`} className="btn">
        File first appeal
      </Link>
      <HelpTip topic="firstAppeal" />
      <span className="text-sm text-muted">
        {window.state === "open"
          ? `Open until ${formatDate(window.closesAt)}.`
          : "The 30-day window has passed; you'll need to give a reason for the delay."}
      </span>
    </div>
  );
}
