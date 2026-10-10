import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { MAX_UPLOAD_BYTES, type DocumentKind } from "@/lib/contract";
import { badRequest } from "@/lib/http";
import { putFile } from "@/lib/storage";
import type { User } from "@/lib/auth/rbac";

const isPdf = (bytes: Uint8Array) =>
  bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";

/** Stores an uploaded PDF (≤ 1 MB, like the real portal) not yet linked to a request. */
export async function saveUpload(
  user: User,
  file: { filename: string; bytes: Uint8Array; kind: DocumentKind },
) {
  if (file.bytes.length > MAX_UPLOAD_BYTES) throw badRequest("The file is over 1 MB. Upload a smaller PDF.");
  if (!isPdf(file.bytes)) throw badRequest("Only PDF files are accepted.");

  const id = randomUUID();
  const filename = file.filename.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || "document.pdf";
  const storageKey = `documents/${id}.pdf`;
  await putFile(storageKey, file.bytes, "application/pdf");

  const db = await getDb();
  const [doc] = await db
    .insert(documents)
    .values({ id, kind: file.kind, storageKey, filename, sizeBytes: file.bytes.length, uploadedBy: user.id })
    .returning();
  return doc;
}
