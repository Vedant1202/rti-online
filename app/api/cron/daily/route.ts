import { getNow } from "@/lib/clock";
import { route } from "@/lib/http";
import { runReminders } from "@/lib/services/reminders";

/** Called by Vercel Cron once a day with "Authorization: Bearer $CRON_SECRET". */
export const GET = route(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runReminders(await getNow());
  return Response.json(result);
});
