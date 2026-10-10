import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { extendInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { extendAppeal } from "@/lib/services/appeals";

export const POST = route(async (req, ctx: RouteContext<"/api/appeals/[id]/extend">) => {
  const user = await requireUser(["faa"]);
  const { id } = await ctx.params;
  await extendAppeal(user, id, await readJson(req, extendInput), await getNow());
  return Response.json({ ok: true });
});
