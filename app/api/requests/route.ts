import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { createRequestInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { createRequest } from "@/lib/services/requests";

export const POST = route(async (req) => {
  const user = await requireUser(["citizen"]);
  const input = await readJson(req, createRequestInput);
  const created = await createRequest(user, input, await getNow());
  return Response.json({ id: created.id }, { status: 201 });
});
