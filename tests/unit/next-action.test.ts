import { describe, it, expect } from "vitest";
import { nextAction, type ActionInput } from "@/lib/next-action";
import type { AppealWindow } from "@/lib/rti/deadlines";

const d = (s: string) => new Date(`${s}T10:00:00+05:30`);
const base: ActionInput = {
  id: "r1",
  status: "forwarded",
  bpl: false,
  openFeePaise: null,
  appeal: null,
  appealed: false,
  hasParts: false,
};
const open: AppealWindow = { state: "open", opensAt: d("2026-09-01"), closesAt: d("2026-10-01") };
const late: AppealWindow = { state: "late", opensAt: d("2026-08-01"), closesAt: d("2026-08-31") };
const notYet: AppealWindow = { state: "not_yet", opensAt: d("2026-11-01"), closesAt: d("2026-12-01") };

describe("nextAction", () => {
  it("asks for the ₹10 fee before a request is filed", () => {
    expect(nextAction({ ...base, status: "pending_payment" })).toEqual({
      kind: "pay_fee",
      requestId: "r1",
      amountPaise: 1000,
      href: "/requests/r1/pay",
    });
  });

  it("asks a BPL applicant to finish filing, with nothing to pay", () => {
    expect(nextAction({ ...base, status: "pending_payment", bpl: true })).toMatchObject({ kind: "pay_fee", amountPaise: 0 });
  });

  it("asks for the additional fee the CPIO requested", () => {
    expect(nextAction({ ...base, status: "fee_requested", openFeePaise: 2400 })).toEqual({
      kind: "pay_additional",
      requestId: "r1",
      amountPaise: 2400,
      href: "/requests/r1/pay",
    });
  });

  it("asks for a requested document on the case page", () => {
    expect(nextAction({ ...base, status: "documents_requested" })).toEqual({
      kind: "upload_document",
      requestId: "r1",
      href: "/requests/r1",
    });
  });

  it("offers to read a reply and appeal while the appeal window is open", () => {
    expect(nextAction({ ...base, status: "replied", appeal: open })).toEqual({
      kind: "read_reply",
      requestId: "r1",
      href: "/requests/r1",
      appealHref: "/appeals/new/r1",
      appealBy: d("2026-10-01"),
    });
    expect(nextAction({ ...base, status: "rejected", appeal: open })).toMatchObject({ kind: "read_reply" });
  });

  it("stops nagging about a reply once the appeal window has closed", () => {
    expect(nextAction({ ...base, status: "replied", appeal: late })).toBeNull();
  });

  it("offers an appeal when the reply is overdue, even after the 30-day window (with a reason for delay)", () => {
    expect(nextAction({ ...base, status: "forwarded", appeal: open })).toEqual({
      kind: "appeal_no_reply",
      requestId: "r1",
      appealHref: "/appeals/new/r1",
      appealBy: d("2026-10-01"),
      late: false,
    });
    expect(nextAction({ ...base, status: "forwarded", appeal: late })).toMatchObject({ kind: "appeal_no_reply", late: true });
  });

  it("has nothing to do before the reply is due", () => {
    expect(nextAction({ ...base, status: "forwarded", appeal: notYet })).toBeNull();
  });

  it("has nothing to do once an appeal is filed", () => {
    expect(nextAction({ ...base, status: "replied", appeal: open, appealed: true })).toBeNull();
    expect(nextAction({ ...base, status: "appeal_filed" })).toBeNull();
    expect(nextAction({ ...base, status: "appeal_decided" })).toBeNull();
  });

  it("leaves split requests to their parts, and ignores closed and transferred ones", () => {
    expect(nextAction({ ...base, status: "split", hasParts: true, appeal: open })).toBeNull();
    expect(nextAction({ ...base, status: "closed_unpaid" })).toBeNull();
    expect(nextAction({ ...base, status: "transferred" })).toBeNull();
  });
});
