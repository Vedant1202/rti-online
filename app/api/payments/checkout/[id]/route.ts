import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { getDb } from "@/lib/db/client";
import { payments, requests } from "@/lib/db/schema";
import { checkoutInput } from "@/lib/contract";
import { forbidden, notFound, readJson, route } from "@/lib/http";
import { handleWebhook, signWebhook } from "@/lib/services/payments";


/** Completes a card checkout. No card is charged: the payment is recorded through the signed callback. */
export const POST = route(async (req, ctx: RouteContext<"/api/payments/checkout/[id]">) => {
  const user = await requireUser(["citizen"]);
  const { id } = await ctx.params;
  const card = await readJson(req, checkoutInput);
  const db = await getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, id));
  if (!payment) throw notFound("Unknown checkout.");
  const [request] = await db.select().from(requests).where(eq(requests.id, payment.requestId));
  if (request.citizenId !== user.id) throw forbidden();

  await handleWebhook(id, { outcome: "success", signature: signWebhook(id, "success"), card }, await getNow());
  return Response.json({ returnUrl: `/requests/${request.id}?paid=1` });
});
