import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { appealInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { fileAppeal } from "@/lib/services/appeals";

export const POST = route(async (req) => {
  const user = await requireUser(["citizen"]);
  const appeal = await fileAppeal(user, await readJson(req, appealInput), await getNow());
  return Response.json({ id: appeal.id, regNo: appeal.regNo }, { status: 201 });
});
