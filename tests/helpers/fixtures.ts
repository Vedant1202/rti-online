import { eq } from "drizzle-orm";
import { seed } from "@/scripts/seed-data";
import { authorities, users } from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";
import type { User } from "@/lib/auth/rbac";

export const PDF = new TextEncoder().encode("%PDF-1.4\n%fake test pdf\n");

/** Seeds authorities/officers and one citizen; returns handy lookups. */
export async function seeded(db: Db) {
  await seed(db, { emailBase: "team@example.com" });
  const [citizen] = await db.insert(users).values({ email: "asha@example.com", name: "Asha" }).returning();
  const [other] = await db.insert(users).values({ email: "ravi@example.com", name: "Ravi" }).returning();
  const auth = async (code: string) =>
    (await db.select().from(authorities).where(eq(authorities.code, code)))[0];
  const officer = async (code: string, tag: string): Promise<User> =>
    (await db.select().from(users).where(eq(users.email, `team+${code.toLowerCase()}.${tag}@example.com`)))[0];
  return { citizen, other, auth, officer };
}
