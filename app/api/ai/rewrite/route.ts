import { z } from "zod";
import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { MAX_REQUEST_CHARS } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { rewriteFormally } from "@/lib/ai/rewrite";

const body = z.object({ text: z.string().trim().min(10, "Write a little more before rewriting.").max(MAX_REQUEST_CHARS) });

export const POST = route(async (req) => {
  const user = await requireUser(["citizen"]);
  const { text } = await readJson(req, body);
  return Response.json(await rewriteFormally(user, { text }, await getNow()));
});
