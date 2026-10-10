import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { authorities, documents, requests } from "@/lib/db/schema";
import type { CreateRequestInput } from "@/lib/contract";
import { badRequest, forbidden } from "@/lib/http";
import type { User } from "@/lib/auth/rbac";

export type RequestRow = typeof requests.$inferSelect;

/** Creates a request awaiting payment. The registration number is assigned on payment. */
export async function createRequest(user: User, input: CreateRequestInput, now: Date): Promise<RequestRow> {
  if (user.role !== "citizen") throw forbidden("Only citizens can file requests.");
  const db = await getDb();

  const [authority] = await db.select().from(authorities).where(eq(authorities.id, input.authorityId));
  if (!authority) throw badRequest("Choose a public authority.");
  if (!authority.isCentral) {
    throw badRequest("This portal only covers central government authorities.");
  }
  if (input.bpl && !input.bplCertificateId) {
    throw badRequest("Upload your BPL certificate to file without a fee.");
  }

  const docIds = [input.attachmentId, input.bpl ? input.bplCertificateId : undefined].filter(
    (id): id is string => Boolean(id),
  );
  if (docIds.length) {
    const owned = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(inArray(documents.id, docIds), eq(documents.uploadedBy, user.id), isNull(documents.requestId)));
    if (owned.length !== docIds.length) throw badRequest("That attachment isn't available. Upload it again.");
  }

  const lifeLibertyReason = input.lifeLibertyReason?.trim() || null;
  return db.transaction(async (tx) => {
    const [req] = await tx
      .insert(requests)
      .values({
        citizenId: user.id,
        authorityId: authority.id,
        subject: input.subject.trim(),
        body: input.body.trim(),
        bpl: input.bpl,
        lifeLiberty: lifeLibertyReason ? "claimed" : "none",
        lifeLibertyReason,
        status: "pending_payment",
        createdAt: now,
      })
      .returning();
    if (docIds.length) {
      await tx.update(documents).set({ requestId: req.id }).where(inArray(documents.id, docIds));
    }
    return req;
  });
}
