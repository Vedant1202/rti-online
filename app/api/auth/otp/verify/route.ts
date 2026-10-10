import { cookies } from "next/headers";
import { verifyOtp } from "@/lib/auth/otp";
import { homeFor } from "@/lib/auth/rbac";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/auth/session";
import { getNow } from "@/lib/clock";
import { otpVerifyInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";

const MESSAGES = {
  invalid: "That code is wrong or has been used. Check the latest email.",
  expired: "That code has expired. Request a new one.",
  locked: "Too many wrong tries. Request a new code.",
};

export const POST = route(async (req) => {
  const { email, code } = await readJson(req, otpVerifyInput);
  const result = await verifyOtp(email, code, await getNow());
  if (!result.ok) return Response.json({ error: MESSAGES[result.error] }, { status: 400 });

  const token = await createSessionToken(result.user);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return Response.json({ ok: true, redirectTo: homeFor(result.user.role) });
});
