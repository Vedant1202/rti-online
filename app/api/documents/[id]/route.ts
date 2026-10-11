import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db/client";
import { documents, requests } from "@/lib/db/schema";
import { forbidden, notFound, route } from "@/lib/http";
import { assertCanView } from "@/lib/services/access";
import { getFile } from "@/lib/storage";

export const GET = route(async (_req, ctx: RouteContext<"/api/documents/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const db = await getDb();
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) throw notFound();
  if (doc.requestId) {
    const [req] = await db.select().from(requests).where(eq(requests.id, doc.requestId));
    assertCanView(user, req);
  } else if (doc.uploadedBy !== user.id) {
    throw forbidden();
  }
  const bytes = await getFile(doc.storageKey);
  if (!bytes) throw notFound("The file is missing from storage.");
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "cache-control": "private, no-store",
    },
  });
});
