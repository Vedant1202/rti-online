import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

let dbPromise: Promise<Db> | null = null;

/**
 * Production uses Neon (WebSocket pool, so transactions work).
 * Without DATABASE_URL, local dev uses an embedded PGlite database in .data/pglite.
 */
export function getDb(): Promise<Db> {
  dbPromise ??= connect();
  return dbPromise;
}

/** Tests inject an in-memory database. */
export function setDbForTests(db: Db) {
  dbPromise = Promise.resolve(db);
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
  const { mkdirSync } = await import("node:fs");
  mkdirSync(path.join(process.cwd(), ".data"), { recursive: true });
  const client = new PGlite(path.join(process.cwd(), ".data", "pglite"));
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Db;
}

export { schema };
