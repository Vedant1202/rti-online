import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { decideInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { decideAppeal } from "@/lib/services/appeals";

export const POST = route(async (req, ctx: RouteContext<"/api/appeals/[id]/decide">) => {
  const user = await requireUser(["faa"]);
  const { id } = await ctx.params;
  await decideAppeal(user, id, await readJson(req, decideInput), await getNow());
  return Response.json({ ok: true });
});
