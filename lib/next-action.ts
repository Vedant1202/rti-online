import { RTI_FEE_PAISE, type RequestStatus } from "@/lib/contract";
import type { AppealWindow } from "@/lib/rti/deadlines";

/** What the citizen's next step on one request (or one split part) depends on. */
export type ActionInput = {
  id: string;
  status: RequestStatus;
  bpl: boolean;
  /** Total of the CPIO's unpaid additional-fee demand, if any. */
  openFeePaise: number | null;
  /** From caseClocks(): the s.19(1) first-appeal window. */
  appeal: AppealWindow | null;
  appealed: boolean;
  /** A split parent: its parts carry the actions. */
  hasParts: boolean;
};

export type NextAction =
  | { kind: "pay_fee"; requestId: string; amountPaise: number; href: string }
  | { kind: "pay_additional"; requestId: string; amountPaise: number; href: string }
  | { kind: "upload_document"; requestId: string; href: string }
  | { kind: "read_reply"; requestId: string; href: string; appealHref: string; appealBy: Date }
  | { kind: "appeal_no_reply"; requestId: string; appealHref: string; appealBy: Date; late: boolean };

/** The one thing the citizen should do next on this request, or null if it's with the officers. */
export function nextAction(r: ActionInput): NextAction | null {
  const requestId = r.id;
  if (r.hasParts) return null;
  switch (r.status) {
    case "pending_payment":
      return { kind: "pay_fee", requestId, amountPaise: r.bpl ? 0 : RTI_FEE_PAISE, href: `/requests/${r.id}/pay` };
    case "fee_requested":
      return { kind: "pay_additional", requestId, amountPaise: r.openFeePaise ?? 0, href: `/requests/${r.id}/pay` };
    case "documents_requested":
      return { kind: "upload_document", requestId, href: `/requests/${r.id}` };
  }
  if (r.appealed || !r.appeal || r.appeal.state === "not_yet") return null;
  if (!["filed", "forwarded", "replied", "rejected"].includes(r.status)) return null;

  const appealHref = `/appeals/new/${r.id}`;
  const appealBy = r.appeal.closesAt;
  if (r.status === "replied" || r.status === "rejected") {
    // Once the 30 days after the reply have passed, it's no longer something to chase.
    if (r.appeal.state === "late") return null;
    return { kind: "read_reply", requestId, href: `/requests/${r.id}`, appealHref, appealBy };
  }
  // No reply and the deadline has passed (s.19(1)); a late appeal needs a reason for the delay.
  return { kind: "appeal_no_reply", requestId, appealHref, appealBy, late: r.appeal.state === "late" };
}
