import { and, eq, isNull } from "drizzle-orm";
import { documents } from "@/lib/db/schema";
import { badRequest } from "@/lib/http";
import type { DocumentKind } from "@/lib/contract";
import type { User } from "@/lib/auth/rbac";
import type { Tx } from "./events";

/** Attaches a PDF the user uploaded (and hasn't used yet) to a request. */
export async function linkUpload(tx: Tx, user: User, documentId: string, requestId: string, kind: DocumentKind) {
  const linked = await tx
    .update(documents)
    .set({ requestId, kind })
    .where(and(eq(documents.id, documentId), eq(documents.uploadedBy, user.id), isNull(documents.requestId)))
    .returning({ id: documents.id });
  if (linked.length === 0) throw badRequest("That file isn't available. Upload it again.");
}
