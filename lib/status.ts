import type { RequestStatus } from "@/lib/contract";

export type Tone = "neutral" | "info" | "warn" | "danger" | "ok";

export const STATUS: Record<RequestStatus, { label: string; tone: Tone }> = {
  pending_payment: { label: "Awaiting payment", tone: "warn" },
  filed: { label: "With nodal officer", tone: "info" },
  forwarded: { label: "With CPIO", tone: "info" },
  split: { label: "Sent to several officers", tone: "info" },
  transferred: { label: "Transferred", tone: "neutral" },
  fee_requested: { label: "Fee requested", tone: "warn" },
  documents_requested: { label: "Document requested", tone: "warn" },
  replied: { label: "Replied", tone: "ok" },
  rejected: { label: "Rejected", tone: "danger" },
  closed_unpaid: { label: "Closed (fee unpaid)", tone: "neutral" },
  appeal_filed: { label: "Appeal with FAA", tone: "info" },
  appeal_decided: { label: "Appeal decided", tone: "ok" },
};
