import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { otps, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";

const TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS = 3;
const SEND_WINDOW_MS = 15 * 60_000;

function hash(email: string, code: string) {
  const pepper = process.env.OTP_PEPPER ?? "dev-pepper";
  return createHash("sha256").update(`${pepper}:${email}:${code}`).digest("hex");
}

export type SendResult = { ok: true; devCode?: string } | { ok: false; error: "rate_limited" };

export async function sendOtp(email: string, now: Date): Promise<SendResult> {
  const db = await getDb();
  const recent = await db
    .select({ id: otps.id })
    .from(otps)
    .where(and(eq(otps.email, email), gt(otps.createdAt, new Date(now.getTime() - SEND_WINDOW_MS))));
  if (recent.length >= MAX_SENDS) return { ok: false, error: "rate_limited" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(otps).values({
    email,
    codeHash: hash(email, code),
    expiresAt: new Date(now.getTime() + TTL_MS),
    createdAt: now,
  });
  await sendEmail({
    to: email,
    subject: `${code} is your RTI Online sign-in code`,
    text: `Your sign-in code is ${code}. It expires in 10 minutes and works once.\n\nIf you didn't ask for this, ignore this email.`,
  });
  return process.env.DEMO_SHOW_OTP === "true" ? { ok: true, devCode: code } : { ok: true };
}

export type VerifyResult =
  | { ok: true; user: typeof users.$inferSelect }
  | { ok: false; error: "invalid" | "expired" | "locked" };

export async function verifyOtp(email: string, code: string, now: Date): Promise<VerifyResult> {
  const db = await getDb();
  // Only the newest unused code counts.
  const [otp] = await db
    .select()
    .from(otps)
    .where(and(eq(otps.email, email), isNull(otps.usedAt)))
    .orderBy(desc(otps.createdAt))
    .limit(1);
  if (!otp) return { ok: false, error: "invalid" };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, error: "locked" };
  if (now > otp.expiresAt) return { ok: false, error: "expired" };

  const matches = timingSafeEqual(Buffer.from(otp.codeHash), Buffer.from(hash(email, code)));
  if (!matches) {
    const attempts = otp.attempts + 1;
    await db.update(otps).set({ attempts }).where(eq(otps.id, otp.id));
    return { ok: false, error: attempts >= MAX_ATTEMPTS ? "locked" : "invalid" };
  }

  await db.update(otps).set({ usedAt: now }).where(eq(otps.id, otp.id));
  const [user] = await db
    .insert(users)
    .values({ email })
    .onConflictDoUpdate({ target: users.email, set: { email } })
    .returning();
  return { ok: true, user };
}
