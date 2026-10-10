import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { authorities, users } from "@/lib/db/schema";
import authorityData from "@/data/authorities.json";
import type { Role } from "@/lib/contract";

/** team@gmail.com + "dopat.nodal" → team+dopat.nodal@gmail.com (Gmail delivers plus-addresses to the same inbox). */
export function plusAddress(base: string, tag: string) {
  const [local, domain] = base.toLowerCase().split("@");
  return `${local}+${tag}@${domain}`;
}

const OFFICERS: { tag: string; role: Role; title: string }[] = [
  { tag: "nodal", role: "nodal", title: "Nodal Officer" },
  { tag: "cpio1", role: "cpio", title: "CPIO (Section A)" },
  { tag: "cpio2", role: "cpio", title: "CPIO (Section B)" },
  { tag: "faa", role: "faa", title: "First Appellate Authority" },
];

/** Idempotent: upserts authorities and officer accounts. Fake names only. */
export async function seed(db: Db, opts: { emailBase: string }) {
  for (const a of authorityData) {
    const [row] = await db
      .insert(authorities)
      .values({ code: a.code, name: a.name, ministry: a.ministry, keywords: a.keywords })
      .onConflictDoUpdate({
        target: authorities.code,
        set: { name: a.name, ministry: a.ministry, keywords: a.keywords },
      })
      .returning();
    for (const o of OFFICERS) {
      const email = plusAddress(opts.emailBase, `${a.code.toLowerCase()}.${o.tag}`);
      await db
        .insert(users)
        .values({ email, name: `${o.title}, ${a.code}`, role: o.role, authorityId: row.id })
        .onConflictDoNothing({ target: users.email });
    }
  }
  const adminEmail = plusAddress(opts.emailBase, "admin");
  const existing = await db.select().from(users).where(eq(users.email, adminEmail));
  if (existing.length === 0) {
    await db.insert(users).values({ email: adminEmail, name: "Admin", role: "admin" });
  }
}
