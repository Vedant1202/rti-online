import "dotenv/config";
import path from "node:path";

async function main() {
  const url = process.env.DATABASE_URL;
  const migrationsFolder = path.join(process.cwd(), "drizzle");

  if (url?.startsWith("postgres")) {
    const { Pool } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
    const pool = new Pool({ connectionString: url });
    await migrate(drizzle({ client: pool }), { migrationsFolder });
    await pool.end();
    console.log("Migrated Neon database");
  } else {
    // Local PGlite migrates itself on first connection.
    const { getDb } = await import("@/lib/db/client");
    await getDb();
    console.log("Migrated local PGlite database in .data/pglite");
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
