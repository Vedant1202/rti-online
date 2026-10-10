import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { forwardInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { forwardRequest } from "@/lib/services/nodal";

export const POST = route(async (req, ctx: RouteContext<"/api/requests/[id]/forward">) => {
  const user = await requireUser(["nodal"]);
  const { id } = await ctx.params;
  await forwardRequest(user, id, await readJson(req, forwardInput), await getNow());
  return Response.json({ ok: true });
});
