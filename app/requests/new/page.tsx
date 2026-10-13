import { asc, eq } from "drizzle-orm";
import { requirePageUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db/client";
import { authorities } from "@/lib/db/schema";
import { loadDraft } from "@/lib/services/drafts";
import { aiEnabled } from "@/lib/ai/gemini";
import { FilingWizard, type Draft } from "./filing-wizard";
import { POPULAR } from "@/lib/authorities";

export default async function NewRequestPage() {
  const user = await requirePageUser("/requests/new", ["citizen"]);
  const draft = await loadDraft(user);
  const db = await getDb();
  const list = await db
    .select({ id: authorities.id, code: authorities.code, name: authorities.name, ministry: authorities.ministry, keywords: authorities.keywords })
    .from(authorities)
    .where(eq(authorities.isCentral, true))
    .orderBy(asc(authorities.name));
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">File an RTI request</h1>
      <FilingWizard authorities={list} popular={POPULAR} draft={(draft?.payload as Draft) ?? null} aiEnabled={aiEnabled()} />
    </div>
  );
}
