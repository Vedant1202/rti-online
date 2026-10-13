import type { RequestStatus } from "@/lib/contract";
import type { Tone } from "@/lib/status";

/** The case-page stepper: Filed → With officer → Reply → Appeal → Decided. */
export const STAGES = ["filed", "with_officer", "reply", "appeal", "decided"] as const;
export type Stage = (typeof STAGES)[number];

type StageInfo = { stage: Stage; tone: Tone; waitingForYou?: boolean; closed?: boolean };

const MAP: Record<RequestStatus, StageInfo> = {
  pending_payment: { stage: "filed", tone: "warn", waitingForYou: true },
  filed: { stage: "with_officer", tone: "info" },
  forwarded: { stage: "with_officer", tone: "info" },
  split: { stage: "with_officer", tone: "info" },
  transferred: { stage: "with_officer", tone: "neutral" },
  fee_requested: { stage: "with_officer", tone: "warn", waitingForYou: true },
  documents_requested: { stage: "with_officer", tone: "warn", waitingForYou: true },
  replied: { stage: "reply", tone: "ok" },
  rejected: { stage: "reply", tone: "danger" },
  closed_unpaid: { stage: "with_officer", tone: "neutral", closed: true },
  appeal_filed: { stage: "appeal", tone: "info" },
  appeal_decided: { stage: "decided", tone: "ok", closed: true },
};

/**
 * Where a request is on the stepper, how to colour it, and whether the citizen has to act.
 * A first appeal is a separate request, so pass its status to move the stepper on.
 */
export function stageFor(status: RequestStatus, appealStatus?: RequestStatus | null) {
  const { stage, tone, waitingForYou = false, closed = false } = MAP[appealStatus ?? status];
  return { stage, index: STAGES.indexOf(stage), tone, waitingForYou, closed };
}
