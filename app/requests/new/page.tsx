import { asc, eq } from "drizzle-orm";
import { requirePageUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db/client";
import { authorities } from "@/lib/db/schema";
import { FilingWizard } from "./filing-wizard";

export default async function NewRequestPage() {
  await requirePageUser("/requests/new", ["citizen"]);
  const db = await getDb();
  const list = await db
    .select({ id: authorities.id, code: authorities.code, name: authorities.name, ministry: authorities.ministry, keywords: authorities.keywords })
    .from(authorities)
    .where(eq(authorities.isCentral, true))
    .orderBy(asc(authorities.name));
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">File an RTI request</h1>
      <FilingWizard authorities={list} />
    </div>
  );
}
