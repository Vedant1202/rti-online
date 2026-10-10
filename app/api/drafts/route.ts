import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { draftInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { saveDraft } from "@/lib/services/drafts";

export const PUT = route(async (req) => {
  const user = await requireUser(["citizen"]);
  const { payload } = await readJson(req, draftInput);
  await saveDraft(user, payload, await getNow());
  return Response.json({ ok: true });
});
