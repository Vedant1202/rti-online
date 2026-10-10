import type { CaseView } from "@/lib/services/views";
import { formatDateTime } from "@/lib/format";
import { formatRupees } from "@/lib/rti/fees";

type Event = CaseView["timeline"][number];
type Doc = CaseView["documents"][number];

const str = (v: unknown) => (typeof v === "string" ? v : "");

function describe(e: Event): { title: string; detail?: string; tone: string } {
  const p = e.payload;
  switch (e.type) {
    case "filed":
      return { title: p.bpl ? "Filed (no fee, below poverty line)" : "Filed and paid", detail: `Registration number ${str(p.regNo)}`, tone: "bg-ok" };
    case "forwarded":
      return { title: `Forwarded to ${str(p.cpioNames) || "the CPIO"}`, tone: "bg-ok" };
    case "split":
      return { title: `Sent to ${p.parts} officers`, detail: "Each part has its own number, reply and appeal.", tone: "bg-ok" };
    case "transferred_out":
      return { title: `Transferred to ${str(p.toAuthority)}`, detail: `New number ${str(p.newRegNo)}. ${str(p.note)}`, tone: "bg-ok" };
    case "transferred_in":
      return { title: `Received by ${str(p.authority)}`, detail: `Registration number ${str(p.regNo)}`, tone: "bg-ok" };
    case "fee_requested":
      return { title: `Additional fee requested: ${formatRupees(Number(p.totalPaise))}`, detail: "The reply clock is paused until you pay.", tone: "bg-warn" };
    case "fee_paid":
      return { title: `Additional fee paid: ${formatRupees(Number(p.amountPaise))}`, detail: "The reply clock restarted.", tone: "bg-ok" };
    case "documents_requested":
      return { title: "Document requested", detail: str(p.note), tone: "bg-warn" };
    case "documents_uploaded":
      return { title: "Document uploaded", tone: "bg-ok" };
    case "replied":
      return { title: "Reply received", detail: str(p.body), tone: "bg-ok" };
    case "rejected":
      return { title: "Request rejected", detail: str(p.reason), tone: "bg-danger" };
    case "closed_unpaid":
      return { title: "Closed: additional fee not paid", tone: "bg-muted" };
    case "life_liberty_claimed":
      return { title: "Life-or-liberty claimed", detail: str(p.reason), tone: "bg-warn" };
    case "life_liberty_accepted":
      return { title: "48-hour limit accepted", detail: str(p.reason), tone: "bg-ok" };
    case "life_liberty_declined":
      return { title: "48-hour limit declined, 30 days apply", detail: str(p.reason), tone: "bg-warn" };
    case "appeal_filed":
      return { title: `First appeal filed: ${str(p.regNo)}`, detail: str(p.ground), tone: "bg-accent" };
    case "appeal_extended":
      return { title: "Appeal deadline extended to 45 days", detail: str(p.reason), tone: "bg-warn" };
    case "appeal_decided":
      return { title: "Appeal decided", detail: str(p.order), tone: "bg-ok" };
  }
}

export function Timeline({ events, documents }: { events: Event[]; documents: Doc[] }) {
  if (events.length === 0) return <p className="text-sm text-muted">Nothing has happened yet.</p>;
  return (
    <ol className="grid gap-0" data-testid="timeline">
      {events.map((e, i) => {
        const d = describe(e);
        const doc = documents.find((x) => x.id === e.payload.documentId);
        return (
          <li key={e.id} className="grid grid-cols-[1.25rem_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className={`mt-1.5 h-3 w-3 rounded-full ${d.tone}`} />
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
