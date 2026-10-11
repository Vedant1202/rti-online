import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import type { Role } from "@/lib/contract";
import { SESSION_COOKIE, readSessionToken } from "./session";

export type User = typeof users.$inferSelect;

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await readSessionToken(token);
  if (!session) return null;
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  return user ?? null;
}

/** Use at the top of every route handler. Throws 401 when signed out, 403 for the wrong role. */
export async function requireUser(roles?: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Sign in first.");
  if (roles && !roles.includes(user.role) && user.role !== "admin") {
    throw new HttpError(403, "You don't have access to this.");
  }
  return user;
}

export function homeFor(role: Role): string {
  switch (role) {
    case "nodal":
      return "/officer/nodal";
    case "cpio":
      return "/officer/cpio";
    case "faa":
      return "/officer/faa";
    case "admin":
      return "/officer/nodal";
    default:
      return "/requests";
  }
}
