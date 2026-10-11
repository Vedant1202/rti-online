import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { authorities } from "@/lib/db/schema";
import { forbidden } from "@/lib/http";
import type { User } from "@/lib/auth/rbac";
import { runAi } from "./limits";

const SYSTEM = `You help applicants choose which Indian central government public authority holds the information in their Right to Information request.
Pick exactly one authority from the list by its id, or "none" if no listed authority fits (for example, a state government or municipal matter).
Give a one-sentence reason in plain English, under 25 words. Never invent an id.`;

/** Gemini picks one seeded central authority (the schema only allows their IDs) and says why. */
export async function recommendAuthority(
  user: User,
  input: { subject: string; body: string },
  now: Date,
): Promise<{ authorityId: string | null; reason: string | null }> {
  if (user.role !== "citizen") throw forbidden();
  const db = await getDb();
  const list = await db
    .select({ id: authorities.id, name: authorities.name, ministry: authorities.ministry })
    .from(authorities)
    .where(eq(authorities.isCentral, true));
  const ids = list.map((a) => a.id);
  const schema = {
    type: "object",
    properties: {
      authorityId: { type: "string", enum: [...ids, "none"] },
      reason: { type: "string" },
    },
    required: ["authorityId", "reason"],
  };
  const prompt = [
    "Authorities:",
    ...list.map((a) => `- id ${a.id}: ${a.name} (${a.ministry})`),
    "",
    `Request subject: ${input.subject}`,
    `Request text: ${input.body.slice(0, 4000)}`,
  ].join("\n");

  return runAi(user, "suggest_authority", now, async (model) => {
    const r = await model.generateJson<{ authorityId: string; reason: string }>({ system: SYSTEM, prompt, schema, fast: true });
    if (!ids.includes(r.authorityId)) return { authorityId: null, reason: null };
    return { authorityId: r.authorityId, reason: (r.reason ?? "").trim().slice(0, 240) || null };
  });
}
