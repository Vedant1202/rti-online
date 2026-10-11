import { z } from "zod";
import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { readJson, route } from "@/lib/http";
import { startCheckout } from "@/lib/services/payments";

export const POST = route(async (req) => {
  const user = await requireUser(["citizen"]);
  const { requestId } = await readJson(req, z.object({ requestId: z.uuid() }));
  const result = await startCheckout(user, requestId, await getNow());
  if (result.kind === "filed") {
    return Response.json({ redirectTo: `/requests/${requestId}?filed=1`, regNo: result.regNo });
  }
  return Response.json({ redirectTo: `/pay/${result.paymentId}` });
});
