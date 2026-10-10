import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { getDb } from "@/lib/db/client";
import { payments, requests } from "@/lib/db/schema";
import { forbidden, notFound, readJson, route } from "@/lib/http";
import { handleWebhook, signWebhook } from "@/lib/services/payments";

const body = z.object({ outcome: z.enum(["success", "failure"]) });

/**
 * The mock gateway's "bank side": signs the outcome and delivers it to our webhook handler,
 * the way a real gateway would call back. No real money moves.
 */
export const POST = route(async (req, ctx: RouteContext<"/api/payments/mock/[id]">) => {
  const user = await requireUser(["citizen"]);
  const { id } = await ctx.params;
  const { outcome } = await readJson(req, body);
  const db = await getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, id));
  if (!payment) throw notFound("Unknown checkout.");
  const [request] = await db.select().from(requests).where(eq(requests.id, payment.requestId));
  if (request.citizenId !== user.id) throw forbidden();

  await handleWebhook(id, { outcome, signature: signWebhook(id, outcome) }, await getNow());
  return Response.json({
    returnUrl: outcome === "success" ? `/requests/${request.id}?paid=1` : `/requests/${request.id}/pay?failed=1`,
  });
});
