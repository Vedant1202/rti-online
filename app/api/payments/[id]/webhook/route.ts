import { z } from "zod";
import { getNow } from "@/lib/clock";
import { readJson, route } from "@/lib/http";
import { handleWebhook } from "@/lib/services/payments";

const body = z.object({ outcome: z.enum(["success", "failure"]), signature: z.string().min(1) });

/** Gateway → app callback. Authenticated by HMAC signature, not by session. */
export const POST = route(async (req, ctx: RouteContext<"/api/payments/[id]/webhook">) => {
  const { id } = await ctx.params;
  const input = await readJson(req, body);
  const result = await handleWebhook(id, input, await getNow());
  return Response.json(result);
});
