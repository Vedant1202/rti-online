import { describe, it, expect } from "vitest";
import {
  replyClock,
  transferClock,
  appealWindow,
  faaClock,
  secondAppealWindow,
} from "@/lib/rti/deadlines";

const d = (iso: string) => new Date(iso);
const FILED = d("2026-10-08T10:00:00Z");

describe("replyClock (s.7(1), s.7(3))", () => {
  const base = { filedAt: FILED, lifeOrLibertyAccepted: false, feePauses: [], repliedAt: null };

  it("is due 30 days after filing", () => {
    const c = replyClock(base, d("2026-10-10T10:00:00Z"));
    expect(c).toEqual({ state: "running", dueAt: d("2026-11-07T10:00:00Z"), daysLeft: 28 });
  });

  it("is overdue after 30 days", () => {
    const c = replyClock(base, d("2026-11-09T11:00:00Z"));
    expect(c.state).toBe("overdue");
    if (c.state === "overdue") expect(c.daysOver).toBe(2);
  });

  it("is met once replied", () => {
    const repliedAt = d("2026-10-20T00:00:00Z");
    expect(replyClock({ ...base, repliedAt }, d("2026-12-01T00:00:00Z"))).toEqual({
      state: "met",
      repliedAt,
    });
  });

  it("uses 48 hours when a life-or-liberty claim is accepted", () => {
    const c = replyClock({ ...base, lifeOrLibertyAccepted: true }, d("2026-10-09T10:00:00Z"));
    expect(c).toEqual({ state: "running", dueAt: d("2026-10-10T10:00:00Z"), daysLeft: 1 });
    expect(replyClock({ ...base, lifeOrLibertyAccepted: true }, d("2026-10-10T11:00:00Z")).state).toBe(
      "overdue",
    );
  });

  it("pauses while an additional fee is unpaid", () => {
    const pauses = [{ from: d("2026-10-18T10:00:00Z"), to: null }];
    const c = replyClock({ ...base, feePauses: pauses }, d("2026-11-20T10:00:00Z"));
    expect(c).toEqual({ state: "paused", dueAt: null, daysLeftWhenPaused: 20 });
  });

  it("moves the due date by exactly the unpaid days once paid", () => {
    const pauses = [{ from: d("2026-10-18T10:00:00Z"), to: d("2026-10-25T10:00:00Z") }];
    const c = replyClock({ ...base, feePauses: pauses }, d("2026-10-26T10:00:00Z"));
    expect(c.state).toBe("running");
    if (c.state === "running") expect(c.dueAt).toEqual(d("2026-11-14T10:00:00Z"));
  });
});

describe("transferClock (s.6(3))", () => {
  it("gives the nodal officer 5 days", () => {
    expect(transferClock(FILED, null, d("2026-10-10T10:00:00Z"))).toEqual({
      state: "running",
      dueAt: d("2026-10-13T10:00:00Z"),
      daysLeft: 3,
    });
  });
  it("is overdue after 5 days and done once acted on", () => {
    expect(transferClock(FILED, null, d("2026-10-14T10:00:00Z")).state).toBe("overdue");
    expect(transferClock(FILED, d("2026-10-09T10:00:00Z"), d("2026-10-20T10:00:00Z")).state).toBe(
      "met",
    );
  });
});

describe("appealWindow (s.19(1))", () => {
  const due = d("2026-11-07T10:00:00Z");

  it("is not open before a reply or the deadline", () => {
    const w = appealWindow({ repliedAt: null, replyDueAt: due, paused: false }, d("2026-10-20T00:00:00Z"));
    expect(w).toEqual({ state: "not_yet", opensAt: due, closesAt: d("2026-12-07T10:00:00Z") });
  });

  it("opens when the deadline passes with no reply", () => {
    const w = appealWindow({ repliedAt: null, replyDueAt: due, paused: false }, d("2026-11-08T00:00:00Z"));
    expect(w.state).toBe("open");
    expect(w.closesAt).toEqual(d("2026-12-07T10:00:00Z"));
  });

  it("opens on reply and runs 30 days from it", () => {
    const repliedAt = d("2026-10-20T10:00:00Z");
    const w = appealWindow({ repliedAt, replyDueAt: due, paused: false }, d("2026-10-21T00:00:00Z"));
    expect(w).toEqual({ state: "open", opensAt: repliedAt, closesAt: d("2026-11-19T10:00:00Z") });
  });

  it("is late after 30 days, which still allows an appeal with a reason", () => {
    const w = appealWindow({ repliedAt: null, replyDueAt: due, paused: false }, d("2026-12-08T00:00:00Z"));
    expect(w.state).toBe("late");
  });

  it("has no opening date while the clock is paused for a fee", () => {
    const w = appealWindow({ repliedAt: null, replyDueAt: null, paused: true }, d("2026-11-20T00:00:00Z"));
    expect(w).toEqual({ state: "not_yet", opensAt: null, closesAt: null });
  });
});

describe("faaClock (s.19(6))", () => {
  const appealFiled = d("2026-11-08T10:00:00Z");

  it("gives 30 days and allows one extension", () => {
    const c = faaClock({ filedAt: appealFiled, extended: false, decidedAt: null }, d("2026-11-10T10:00:00Z"));
    expect(c).toMatchObject({ state: "running", dueAt: d("2026-12-08T10:00:00Z"), canExtend: true });
  });

  it("allows at most 45 days in total once extended", () => {
    const c = faaClock({ filedAt: appealFiled, extended: true, decidedAt: null }, d("2026-12-10T10:00:00Z"));
    expect(c).toMatchObject({ state: "running", dueAt: d("2026-12-23T10:00:00Z"), canExtend: false });
  });

  it("can't be extended after day 30 has passed", () => {
    const c = faaClock({ filedAt: appealFiled, extended: false, decidedAt: null }, d("2026-12-09T10:00:00Z"));
    expect(c).toMatchObject({ state: "overdue", canExtend: false });
  });

  it("is met once decided", () => {
    const decidedAt = d("2026-11-20T10:00:00Z");
    expect(faaClock({ filedAt: appealFiled, extended: false, decidedAt }, d("2026-12-30T00:00:00Z"))).toEqual({
      state: "met",
      decidedAt,
      canExtend: false,
    });
  });
});

describe("secondAppealWindow (s.19(3))", () => {
  it("closes 90 days after the decision", () => {
    expect(secondAppealWindow(d("2026-11-20T10:00:00Z"))).toEqual(d("2027-02-18T10:00:00Z"));
  });
});
