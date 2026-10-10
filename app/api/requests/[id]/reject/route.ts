import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { rejectInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { rejectRequest } from "@/lib/services/cpio";

export const POST = route(async (req, ctx: RouteContext<"/api/requests/[id]/reject">) => {
  const user = await requireUser(["cpio"]);
  const { id } = await ctx.params;
  await rejectRequest(user, id, await readJson(req, rejectInput), await getNow());
  return Response.json({ ok: true });
});
