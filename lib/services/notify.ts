import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

/** Emails the citizen behind a request. Called after the database transaction commits. */
export async function notifyCitizen(
  citizenId: string,
  msg: { subject: string; lines: string[]; requestId?: string },
) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, citizenId));
  if (!user) return;
  const link = msg.requestId ? `\n\nView it here: ${appUrl()}/requests/${msg.requestId}` : "";
  await sendEmail({
    to: user.email,
    subject: msg.subject,
    text: `${msg.lines.join("\n\n")}${link}\n\nRTI Online Rebuild (student project)`,
  });
}
