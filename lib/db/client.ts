import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

// Kept on globalThis: Next.js bundles route handlers and pages separately, and they must share one connection.
const globalForDb = globalThis as unknown as { __rtiDb?: Promise<Db> };

/**
 * Production uses Neon (WebSocket pool, so transactions work).
 * Without DATABASE_URL, local dev uses an embedded PGlite database in .data/pglite.
 */
export function getDb(): Promise<Db> {
  globalForDb.__rtiDb ??= connect();
  return globalForDb.__rtiDb;
}

/** Tests inject an in-memory database. */
export function setDbForTests(db: Db) {
  globalForDb.__rtiDb = Promise.resolve(db);
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("postgres")) {
    const { Pool } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    return drizzle({ client: new Pool({ connectionString: url }), schema }) as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // PGLITE=memory gives a fresh database per server start (used by end-to-end tests).
  let client;
  if (process.env.PGLITE === "memory") {
    client = new PGlite();
  } else {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(path.join(process.cwd(), ".data"), { recursive: true });
    client = new PGlite(path.join(process.cwd(), ".data", "pglite"));
  }
  const db = drizzle({ client, schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: MIGRATIONS });
  await seedIfEmpty(db);
  return db;
}

/** A brand-new local database gets the demo authorities and officers automatically. */
async function seedIfEmpty(db: Db) {
  const emailBase = process.env.SEED_EMAIL_BASE ?? process.env.GMAIL_USER;
  if (!emailBase) return;
  const existing = await db.select({ id: schema.authorities.id }).from(schema.authorities).limit(1);
  if (existing.length > 0) return;
  const { seed } = await import("@/scripts/seed-data");
  await seed(db, { emailBase });
}

export { schema };
