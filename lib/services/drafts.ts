import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { drafts } from "@/lib/db/schema";
import { forbidden } from "@/lib/http";
import type { User } from "@/lib/auth/rbac";

export async function saveDraft(user: User, payload: Record<string, unknown>, now: Date) {
  if (user.role !== "citizen") throw forbidden();
  const db = await getDb();
  await db
    .insert(drafts)
    .values({ citizenId: user.id, payload, updatedAt: now })
    .onConflictDoUpdate({ target: drafts.citizenId, set: { payload, updatedAt: now } });
}

export async function loadDraft(user: User) {
  const db = await getDb();
  const [row] = await db.select().from(drafts).where(eq(drafts.citizenId, user.id));
  return row ?? null;
}
