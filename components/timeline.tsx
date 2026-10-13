import type { CaseView } from "@/lib/services/views";
import { formatDateTime } from "@/lib/format";
import { formatRupees } from "@/lib/rti/fees";
import { BRAND_NAME, type CardSummary } from "@/lib/card";
import { en } from "@/lib/i18n/en";
import { fmt, type Dict } from "@/lib/i18n";
import type { EventType } from "@/lib/contract";
import {
  Archive,
  ArrowRightLeft,
  Ban,
  CalendarClock,
  CreditCard,
  FileCheck2,
  FileQuestion,
  Gavel,
  GitFork,
  HeartPulse,
  Inbox,
  IndianRupee,
  MessageSquareText,
  Scale,
  Send,
  ShieldCheck,
  ShieldX,
  Upload,
  type LucideIcon,
} from "lucide-react";

const EVENT_ICON: Record<EventType, LucideIcon> = {
  filed: FileCheck2,
  forwarded: Send,
  split: GitFork,
  transferred_out: ArrowRightLeft,
  transferred_in: Inbox,
  fee_requested: IndianRupee,
  fee_paid: CreditCard,
  documents_requested: FileQuestion,
  documents_uploaded: Upload,
  replied: MessageSquareText,
  rejected: Ban,
  closed_unpaid: Archive,
  life_liberty_claimed: HeartPulse,
  life_liberty_accepted: ShieldCheck,
  life_liberty_declined: ShieldX,
  appeal_filed: Scale,
  appeal_extended: CalendarClock,
  appeal_decided: Gavel,
};

const TONE_TEXT: Record<string, string> = {
  "bg-ok": "text-ok border-ok",
  "bg-warn": "text-warn border-warn",
  "bg-danger": "text-danger border-danger",
  "bg-accent": "text-accent border-accent",
  "bg-muted": "text-muted border-line",
};

type Event = CaseView["timeline"][number];
type Doc = CaseView["documents"][number];

const str = (v: unknown) => (typeof v === "string" ? v : "");

function paid(amountPaise: number, card: CardSummary | null, t: Dict) {
  const amount = formatRupees(amountPaise);
  return card ? fmt(t.timeline.paidCard, { amount, brand: BRAND_NAME[card.brand], last4: card.last4 }) : fmt(t.timeline.paid, { amount });
}

function describe(e: Event, t: Dict): { title: string; detail?: string; tone: string } {
  const p = e.payload;
  const tl = t.timeline;
  switch (e.type) {
    case "filed":
      return {
        title: p.bpl ? tl.filedBpl : tl.filedPaid,
        detail: [
          fmt(tl.regNo, { regNo: str(p.regNo) }),
          !p.bpl && Number(p.amountPaise) > 0 ? paid(Number(p.amountPaise), p.card as CardSummary | null, t) : "",
        ]
          .filter(Boolean)
          .join(" "),
        tone: "bg-ok",
      };
    case "forwarded":
      return { title: fmt(tl.forwarded, { names: str(p.cpioNames) || tl.theCpio }), tone: "bg-ok" };
    case "split":
      return { title: fmt(tl.split, { n: Number(p.parts) }), detail: tl.splitDetail, tone: "bg-ok" };
    case "transferred_out":
      return {
        title: fmt(tl.transferredOut, { authority: str(p.toAuthority) }),
        detail: fmt(tl.transferredOutDetail, { regNo: str(p.newRegNo), note: str(p.note) }),
        tone: "bg-ok",
      };
    case "transferred_in":
      return {
        title: fmt(tl.transferredIn, { authority: str(p.authority) }),
        detail: fmt(tl.transferredInDetail, { regNo: str(p.regNo) }),
        tone: "bg-ok",
      };
    case "fee_requested":
      return { title: fmt(tl.feeRequested, { amount: formatRupees(Number(p.totalPaise)) }), detail: tl.feeRequestedDetail, tone: "bg-warn" };
    case "fee_paid":
      return {
        title: fmt(tl.feePaid, { amount: formatRupees(Number(p.amountPaise)) }),
        detail: fmt(tl.feePaidDetail, { paid: paid(Number(p.amountPaise), p.card as CardSummary | null, t) }),
        tone: "bg-ok",
      };
    case "documents_requested":
      return { title: tl.documentsRequested, detail: str(p.note), tone: "bg-warn" };
    case "documents_uploaded":
      return { title: tl.documentsUploaded, tone: "bg-ok" };
    case "replied":
      return { title: tl.replied, detail: str(p.body), tone: "bg-ok" };
    case "rejected":
      return { title: tl.rejected, detail: str(p.reason), tone: "bg-danger" };
    case "closed_unpaid":
      return { title: tl.closedUnpaid, tone: "bg-muted" };
    case "life_liberty_claimed":
      return { title: tl.llClaimed, detail: str(p.reason), tone: "bg-warn" };
    case "life_liberty_accepted":
      return { title: tl.llAccepted, detail: str(p.reason), tone: "bg-ok" };
    case "life_liberty_declined":
      return { title: tl.llDeclined, detail: str(p.reason), tone: "bg-warn" };
    case "appeal_filed":
      return { title: fmt(tl.appealFiled, { regNo: str(p.regNo) }), detail: str(p.ground), tone: "bg-accent" };
    case "appeal_extended":
      return { title: tl.appealExtended, detail: str(p.reason), tone: "bg-warn" };
    case "appeal_decided":
      return { title: tl.appealDecided, detail: str(p.order), tone: "bg-ok" };
  }
}

/** English unless a citizen page passes its dictionary. */
export function Timeline({ events, documents, t = en }: { events: Event[]; documents: Doc[]; t?: Dict }) {
  if (events.length === 0) return <p className="text-sm text-muted">{t.timeline.empty}</p>;
  return (
    <ol className="grid gap-0" data-testid="timeline">
      {events.map((e, i) => {
        const d = describe(e, t);
        const doc = documents.find((x) => x.id === e.payload.documentId);
        return (
          <li key={e.id} className="grid grid-cols-[1.75rem_1fr] gap-3">
            <div className="flex flex-col items-center">
              <EventIcon type={e.type} tone={d.tone} />
              {i < events.length - 1 && <span className="w-px flex-1 bg-line" />}
            </div>
            <div className="grid gap-1 pb-5">
              <p className="font-semibold">{d.title}</p>
              <p className="text-xs text-muted">
                {formatDateTime(e.at)}
                {e.actorName && e.actorRole !== "citizen" ? ` · ${e.actorName}` : ""}
              </p>
              {d.detail && <p className="whitespace-pre-wrap text-sm">{d.detail}</p>}
              {doc && (
                <a className="text-sm text-accent underline" href={`/api/documents/${doc.id}`} target="_blank" rel="noreferrer">
                  {doc.filename}
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EventIcon({ type, tone }: { type: EventType; tone: string }) {
  const Icon = EVENT_ICON[type];
  return (
    <span
      className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-surface ${TONE_TEXT[tone] ?? "text-muted border-line"}`}
      aria-hidden="true"
    >
      <Icon size={14} />
    </span>
  );
}
