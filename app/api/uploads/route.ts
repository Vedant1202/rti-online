import { requireUser } from "@/lib/auth/rbac";
import { DOCUMENT_KINDS, type DocumentKind } from "@/lib/contract";
import { badRequest, route } from "@/lib/http";
import { saveUpload } from "@/lib/services/uploads";

export const POST = route(async (req) => {
  const user = await requireUser();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  if (!(file instanceof File)) throw badRequest("Choose a PDF to upload.");
  if (typeof kind !== "string" || !DOCUMENT_KINDS.includes(kind as DocumentKind)) {
    throw badRequest("Unknown document type.");
  }
  const doc = await saveUpload(user, {
    filename: file.name,
    bytes: new Uint8Array(await file.arrayBuffer()),
    kind: kind as DocumentKind,
  });
  return Response.json({ id: doc.id, filename: doc.filename, sizeBytes: doc.sizeBytes });
});
