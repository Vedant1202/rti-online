import { forbidden } from "@/lib/http";
import type { User } from "@/lib/auth/rbac";
import { MAX_REQUEST_CHARS } from "@/lib/contract";
import { AiError } from "./gemini";
import { runAi } from "./limits";

/** Details that must survive a rewrite: anything with a digit (file numbers, dates, amounts) and [placeholders]. */
export function mustKeep(text: string): string[] {
  const tokens = text.match(/\[[^\]\n]{1,40}\]|[\p{L}\p{N}][\p{L}\p{N}/.\-]*/gu) ?? [];
  const kept = tokens
    .map((t) => (t.startsWith("[") ? t : t.replace(/[./\-]+$/, "")))
    .filter((t) => t.startsWith("[") || /\p{N}/u.test(t));
  return [...new Set(kept)];
}

const devanagari = (s: string) => (s.match(/[ऀ-ॿ]/g) ?? []).length;
const latin = (s: string) => (s.match(/[A-Za-z]/g) ?? []).length;
const mostlyHindi = (s: string) => devanagari(s) > latin(s);

const SYSTEM = `You rewrite Right to Information (RTI) requests to Indian central government authorities so they read formally and clearly.
Rules:
- Write in the SAME language and script as the input. Hindi stays Hindi (Devanagari). English stays English.
- Keep every fact, name, date, number, file or reference number exactly as written. Copy them character for character.
- Keep every [placeholder in square brackets] exactly as written.
- Do not invent facts, dates, names, numbers or reasons. Do not add a reason for asking (none is required, RTI Act s.6(2)).
- Phrase it as a polite request for specific information or records, as a numbered list when it asks for several things.
- Do not add a salutation, signature, address or date line.`;

const SCHEMA = {
  type: "object",
  properties: { rewritten: { type: "string", description: "The formal rewrite." } },
  required: ["rewritten"],
};

export async function rewriteFormally(user: User, input: { text: string }, now: Date): Promise<{ rewritten: string }> {
  if (user.role !== "citizen") throw forbidden("Only applicants can use the rewrite.");
  const keep = mustKeep(input.text);
  const hindi = mostlyHindi(input.text);

  return runAi(user, "rewrite", now, async (model) => {
    let reminder = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const prompt = `${reminder}Rewrite this RTI request formally:\n\n${input.text}`;
      const { rewritten } = await model.generateJson<{ rewritten: string }>({ system: SYSTEM, prompt, schema: SCHEMA });
      const text = (rewritten ?? "").trim().slice(0, MAX_REQUEST_CHARS);
      const missing = keep.filter((k) => !text.includes(k));
      const wrongLanguage = hindi && devanagari(text) === 0;
      if (text && missing.length === 0 && !wrongLanguage) return { rewritten: text };
      reminder =
        `Your previous answer ${wrongLanguage ? "was not in Hindi. Answer in Hindi (Devanagari). " : ""}` +
        `${missing.length ? `left out: ${missing.join(", ")}. Include every one of these exactly: ${keep.join(", ")}. ` : ""}\n\n`;
    }
    throw new AiError("failed", "The AI couldn't keep all your details (numbers, dates or placeholders). Your text wasn't changed.");
  });
}
