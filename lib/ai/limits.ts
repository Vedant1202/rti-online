import { and, asc, eq, gt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { aiUsage } from "@/lib/db/schema";
import type { User } from "@/lib/auth/rbac";
import { AiError, getAiModel, type AiModel } from "./gemini";

export const AI_HOURLY_LIMIT = 20;
const HOUR_MS = 60 * 60 * 1000;

/** Runs one AI call for a user, enforcing 20 calls an hour so one person can't use up the free quota. */
export async function runAi<T>(user: User, kind: string, now: Date, call: (model: AiModel) => Promise<T>): Promise<T> {
  const model = getAiModel(); // throws "disabled" first, before counting anything
  const db = await getDb();
  const since = new Date(now.getTime() - HOUR_MS);
  const recent = await db
    .select({ at: aiUsage.at })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, user.id), gt(aiUsage.at, since)))
    .orderBy(asc(aiUsage.at));
  if (recent.length >= AI_HOURLY_LIMIT) {
    const freeAt = recent[0].at.getTime() + HOUR_MS;
    const minutes = Math.max(1, Math.ceil((freeAt - now.getTime()) / 60_000));
    throw new AiError("rate_limited", `You've used the AI features ${AI_HOURLY_LIMIT} times in the last hour. Try again in ${minutes} minutes.`, minutes);
  }
  await db.insert(aiUsage).values({ userId: user.id, kind, at: now });
  return call(model);
}
