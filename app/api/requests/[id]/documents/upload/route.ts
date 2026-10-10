import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { documentsUploadInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { uploadRequestedDocument } from "@/lib/services/cpio-extra";

export const POST = route(async (req, ctx: RouteContext<"/api/requests/[id]/documents/upload">) => {
  const user = await requireUser(["citizen"]);
  const { id } = await ctx.params;
  await uploadRequestedDocument(user, id, await readJson(req, documentsUploadInput), await getNow());
  return Response.json({ ok: true });
});
