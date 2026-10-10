import "dotenv/config";
import { getDb } from "@/lib/db/client";
import { seed } from "./seed-data";

async function main() {
  const emailBase = process.env.SEED_EMAIL_BASE ?? process.env.GMAIL_USER;
  if (!emailBase) throw new Error("Set SEED_EMAIL_BASE (or GMAIL_USER) to the team Gmail address first.");
  await seed(await getDb(), { emailBase });
  console.log(`Seeded authorities and officers using ${emailBase}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
