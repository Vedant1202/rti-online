import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { feeDemandInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { requestFee } from "@/lib/services/cpio-extra";

export const POST = route(async (req, ctx: RouteContext<"/api/requests/[id]/fee">) => {
  const user = await requireUser(["cpio"]);
  const { id } = await ctx.params;
  await requestFee(user, id, await readJson(req, feeDemandInput), await getNow());
  return Response.json({ ok: true });
});
