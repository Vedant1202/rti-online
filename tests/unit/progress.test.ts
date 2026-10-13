import { describe, it, expect } from "vitest";
import { REQUEST_STATUSES, type RequestStatus } from "@/lib/contract";
import { STAGES, stageFor } from "@/lib/progress";

describe("stageFor", () => {
  it("has five stages in order", () => {
    expect(STAGES).toEqual(["filed", "with_officer", "reply", "appeal", "decided"]);
  });

  const expected: Record<RequestStatus, { stage: (typeof STAGES)[number]; tone: string; waitingForYou: boolean; closed: boolean }> = {
    pending_payment: { stage: "filed", tone: "warn", waitingForYou: true, closed: false },
    filed: { stage: "with_officer", tone: "info", waitingForYou: false, closed: false },
    forwarded: { stage: "with_officer", tone: "info", waitingForYou: false, closed: false },
    split: { stage: "with_officer", tone: "info", waitingForYou: false, closed: false },
    transferred: { stage: "with_officer", tone: "neutral", waitingForYou: false, closed: false },
    fee_requested: { stage: "with_officer", tone: "warn", waitingForYou: true, closed: false },
    documents_requested: { stage: "with_officer", tone: "warn", waitingForYou: true, closed: false },
    replied: { stage: "reply", tone: "ok", waitingForYou: false, closed: false },
    rejected: { stage: "reply", tone: "danger", waitingForYou: false, closed: false },
    closed_unpaid: { stage: "with_officer", tone: "neutral", waitingForYou: false, closed: true },
    appeal_filed: { stage: "appeal", tone: "info", waitingForYou: false, closed: false },
    appeal_decided: { stage: "decided", tone: "ok", waitingForYou: false, closed: true },
  };

  it.each(REQUEST_STATUSES.map((s) => [s]))("maps %s", (status) => {
    const result = stageFor(status);
    expect(result).toEqual({ ...expected[status], index: STAGES.indexOf(expected[status].stage) });
  });
});
