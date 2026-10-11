import { sendOtp } from "@/lib/auth/otp";
import { getNow } from "@/lib/clock";
import { otpSendInput } from "@/lib/contract";
import { readJson, route } from "@/lib/http";

export const POST = route(async (req) => {
  const { email } = await readJson(req, otpSendInput);
  const result = await sendOtp(email, await getNow());
  if (!result.ok) {
    return Response.json(
      { error: "Too many codes requested. Wait 15 minutes and try again." },
      { status: 429 },
    );
  }
  return Response.json({ ok: true, devCode: result.devCode });
});
