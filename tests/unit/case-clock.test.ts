import { describe, it, expect } from "vitest";
import { caseClocks } from "@/lib/rti/case-clock";

const d = (iso: string) => new Date(iso);
const req = { filedAt: d("2026-10-08T10:00:00Z"), lifeLiberty: "none" as const, status: "forwarded" as const };

describe("caseClocks", () => {
  it("has no clocks before the request is filed", () => {
    expect(caseClocks({ ...req, filedAt: null, status: "pending_payment" }, [], [], d("2026-10-09T00:00:00Z"))).toEqual({
      reply: null,
      appeal: null,
    });
  });

  it("derives the reply clock and appeal window from events", () => {
    const c = caseClocks(req, [], [], d("2026-10-10T10:00:00Z"));
    expect(c.reply).toMatchObject({ state: "running", daysLeft: 28 });
    expect(c.appeal).toMatchObject({ state: "not_yet", opensAt: d("2026-11-07T10:00:00Z") });
  });

  it("treats a reply or rejection as the decision", () => {
    const events = [{ type: "rejected" as const, at: d("2026-10-20T10:00:00Z") }];
    const c = caseClocks({ ...req, status: "rejected" }, events, [], d("2026-10-21T10:00:00Z"));
    expect(c.reply).toMatchObject({ state: "met" });
    expect(c.appeal).toMatchObject({ state: "open", closesAt: d("2026-11-19T10:00:00Z") });
  });

  it("pauses for an unpaid fee demand and resumes after payment", () => {
    const unpaid = [{ sentAt: d("2026-10-18T10:00:00Z"), paidAt: null }];
    expect(caseClocks({ ...req, status: "fee_requested" }, [], unpaid, d("2026-10-20T10:00:00Z")).reply).toMatchObject({
      state: "paused",
      daysLeftWhenPaused: 20,
    });
    const paid = [{ sentAt: d("2026-10-18T10:00:00Z"), paidAt: d("2026-10-25T10:00:00Z") }];
    expect(caseClocks(req, [], paid, d("2026-10-26T10:00:00Z")).reply).toMatchObject({
      state: "running",
      dueAt: d("2026-11-14T10:00:00Z"),
    });
  });

  it("uses 48 hours only after the claim is accepted", () => {
    expect(caseClocks({ ...req, lifeLiberty: "claimed" }, [], [], d("2026-10-11T10:00:00Z")).reply).toMatchObject({
      state: "running",
    });
    expect(caseClocks({ ...req, lifeLiberty: "accepted" }, [], [], d("2026-10-11T10:00:00Z")).reply).toMatchObject({
      state: "overdue",
    });
  });

  it("has no clocks on a request that was transferred away", () => {
    expect(caseClocks({ ...req, status: "transferred" }, [], [], d("2026-10-11T10:00:00Z"))).toEqual({
      reply: null,
      appeal: null,
    });
  });
});
