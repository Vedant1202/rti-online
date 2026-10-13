import Link from "next/link";
import type { CaseView } from "@/lib/services/views";
import { formatRupees } from "@/lib/rti/fees";
import { formatDate } from "@/lib/format";
import { UploadRequested } from "./upload-requested";
import { HelpTip } from "@/components/help-tip";
import type { NextAction } from "@/lib/next-action";
import { fmt, type Dict } from "@/lib/i18n";

/**
 * Details for the citizen's next step on this request (fee breakdown, upload panel, appeal dates).
 * When the pinned next-action bar is showing, its button is the only one, so it isn't repeated here.
 */
export function CitizenActions({ view, action, t }: { view: CaseView; action: NextAction | null; t: Dict }) {
  const { current } = view;
  const appealed = view.appeals.some((a) => a.parentId === current.id);
  const window = view.clocks.appeal;
  if (current.status === "pending_payment") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">{t.citizen.notFiled}</p>
        {!action && (
          <Link href={`/requests/${current.id}/pay`} className="btn">
            {current.bpl ? t.citizen.fileRequest : fmt(t.citizen.pay, { amount: "₹10" })}
          </Link>
        )}
      </div>
    );
  }
  if (current.status === "fee_requested") {
    const open = view.demands.find((d) => !d.paidAt);
    return (
      <div className="grid gap-3" data-testid="fee-breakdown">
        <p className="flex items-center gap-1 font-semibold">
          {t.citizen.feeAsked} <HelpTip topic="pausedClock" />
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
                <td className="py-1 font-semibold">{t.citizen.total}</td>
                <td className="py-1 text-right font-semibold tabular-nums">{formatRupees(open.totalPaise)}</td>
              </tr>
            </tbody>
          </table>
        )}
        {!action && (
          <Link href={`/requests/${current.id}/pay`} className="btn w-fit">
            {open ? fmt(t.citizen.pay, { amount: formatRupees(open.totalPaise) }) : t.citizen.payFee}
          </Link>
        )}
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
        {fmt(t.citizen.appealOpens, { date: formatDate(window.opensAt, t.meta.locale) })}
      </p>
    ) : null;
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {!action && (
        <Link href={`/appeals/new/${current.id}`} className="btn">
          {t.citizen.fileAppeal}
        </Link>
      )}
      <HelpTip topic="firstAppeal" />
      <span className="text-sm text-muted">
        {window.state === "open" ? fmt(t.citizen.openUntil, { date: formatDate(window.closesAt, t.meta.locale) }) : t.citizen.windowPassed}
      </span>
    </div>
  );
}
