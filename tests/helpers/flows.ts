import { createRequest } from "@/lib/services/requests";
import { completePayment, startCheckout } from "@/lib/services/payments";
import type { User } from "@/lib/auth/rbac";

/** Files and pays a request in one go; returns the filed request id and number. */
export async function fileAndPay(
  citizen: User,
  authorityId: string,
  now: Date,
  extra: { subject?: string; body?: string; lifeLibertyReason?: string } = {},
) {
  const req = await createRequest(
    citizen,
    {
      authorityId,
      subject: extra.subject ?? "Pension status",
      body: extra.body ?? "Please give the status of PPO 4471.",
      bpl: false,
      lifeLibertyReason: extra.lifeLibertyReason,
    },
    now,
  );
  const c = await startCheckout(citizen, req.id, now);
  if (c.kind !== "checkout") throw new Error("expected checkout");
  const { regNo } = await completePayment(c.paymentId, "success", now);
  return { id: req.id, regNo: regNo! };
}
