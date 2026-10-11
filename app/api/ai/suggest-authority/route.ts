import { z } from "zod";
import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { MAX_REQUEST_CHARS } from "@/lib/contract";
import { readJson, route } from "@/lib/http";
import { recommendAuthority } from "@/lib/ai/suggest-authority";

const body = z.object({ subject: z.string().trim().max(150), body: z.string().trim().min(1).max(MAX_REQUEST_CHARS) });

export const POST = route(async (req) => {
  const user = await requireUser(["citizen"]);
  return Response.json(await recommendAuthority(user, await readJson(req, body), await getNow()));
});
