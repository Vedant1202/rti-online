import { z } from "zod";
import { setClockOffset, testClockEnabled } from "@/lib/clock";
import { readJson, route } from "@/lib/http";

/** Test-only: moves the app's clock forward. Returns 404 unless E2E_CLOCK=true (never on Vercel). */
export const POST = route(async (req) => {
  if (!testClockEnabled()) return new Response("Not found", { status: 404 });
  const { days } = await readJson(req, z.object({ days: z.number().min(0).max(400) }));
  setClockOffset(days * 24 * 60 * 60 * 1000);
  return Response.json({ ok: true, days });
});
