import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/contract";
import { ROLES } from "@/lib/contract";

export const SESSION_COOKIE = "rti_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // seconds

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be 32+ characters");
    return new TextEncoder().encode("dev-only-session-secret-not-for-production!!");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(user: { id: string; role: Role }): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function readSessionToken(token: string): Promise<{ userId: string; role: Role } | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const role = payload.role as Role;
    if (!payload.sub || !ROLES.includes(role)) return null;
    return { userId: payload.sub, role };
  } catch {
    return null;
  }
}
