import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { lifeLibertyDecisionInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { decideLifeLiberty } from "@/lib/services/life-liberty";

export const POST = route(async (req, ctx: RouteContext<"/api/requests/[id]/life-liberty">) => {
  const user = await requireUser(["cpio"]);
  const { id } = await ctx.params;
  await decideLifeLiberty(user, id, await readJson(req, lifeLibertyDecisionInput), await getNow());
  return Response.json({ ok: true });
});
