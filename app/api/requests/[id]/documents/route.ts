import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { documentsRequestInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { requestDocuments } from "@/lib/services/cpio-extra";

export const POST = route(async (req, ctx: RouteContext<"/api/requests/[id]/documents">) => {
  const user = await requireUser(["cpio"]);
  const { id } = await ctx.params;
  await requestDocuments(user, id, await readJson(req, documentsRequestInput), await getNow());
  return Response.json({ ok: true });
});
