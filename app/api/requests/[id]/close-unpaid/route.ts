import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { route } from "@/lib/http";
import { closeUnpaid } from "@/lib/services/cpio-extra";

export const POST = route(async (_req, ctx: RouteContext<"/api/requests/[id]/close-unpaid">) => {
  const user = await requireUser(["cpio"]);
  const { id } = await ctx.params;
  await closeUnpaid(user, id, await getNow());
  return Response.json({ ok: true });
});
