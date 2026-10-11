import "dotenv/config";
import { getDb } from "@/lib/db/client";
import { seed } from "./seed-data";
import { seedDemo } from "./demo-data";

async function main() {
  const emailBase = process.env.SEED_EMAIL_BASE ?? process.env.GMAIL_USER;
  if (!emailBase) throw new Error("Set SEED_EMAIL_BASE (or GMAIL_USER) first.");
  const db = await getDb();
  await seed(db, { emailBase });
  await seedDemo(db, { emailBase, now: new Date() });
  console.log("Added demo cases. Sign in as", emailBase.replace("@", "+citizen.asha@"), "to see them.");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
