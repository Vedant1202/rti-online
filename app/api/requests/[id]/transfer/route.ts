import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { transferInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { transferRequest } from "@/lib/services/nodal";

export const POST = route(async (req, ctx: RouteContext<"/api/requests/[id]/transfer">) => {
  const user = await requireUser(["nodal"]);
  const { id } = await ctx.params;
  const moved = await transferRequest(user, id, await readJson(req, transferInput), await getNow());
  return Response.json({ ok: true, regNo: moved.regNo });
});
