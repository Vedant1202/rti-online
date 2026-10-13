import type { RequestStatus } from "@/lib/contract";
import { en } from "@/lib/i18n/en";

export type Tone = "neutral" | "info" | "warn" | "danger" | "ok";

const TONE: Record<RequestStatus, Tone> = {
  pending_payment: "warn",
  filed: "info",
  forwarded: "info",
  split: "info",
  transferred: "neutral",
  fee_requested: "warn",
  documents_requested: "warn",
  replied: "ok",
  rejected: "danger",
  closed_unpaid: "neutral",
  appeal_filed: "info",
  appeal_decided: "ok",
};

/** Status label and tone. Labels are English here (officer pages); citizen pages use t.status[status]. */
export const STATUS = Object.fromEntries(
  (Object.keys(TONE) as RequestStatus[]).map((s) => [s, { label: en.status[s], tone: TONE[s] }]),
) as Record<RequestStatus, { label: string; tone: Tone }>;
