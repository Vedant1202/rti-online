import { requireUser } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { route } from "@/lib/http";
import { buildCaseBundle } from "@/lib/services/bundle";

export const GET = route(async (_req, ctx: RouteContext<"/api/appeals/[id]/bundle">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { filename, html } = await buildCaseBundle(user, id, await getNow());
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
});
