import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { replyInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { replyToRequest } from "@/lib/services/cpio";

export const POST = route(async (req, ctx: RouteContext<"/api/requests/[id]/reply">) => {
  const user = await requireUser(["cpio"]);
  const { id } = await ctx.params;
  await replyToRequest(user, id, await readJson(req, replyInput), await getNow());
  return Response.json({ ok: true });
});
