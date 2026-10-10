import type { DocumentKind } from "@/lib/contract";

export type Uploaded = { id: string; filename: string; sizeBytes: number };

export async function uploadPdf(file: File, kind: DocumentKind): Promise<Uploaded> {
  const form = new FormData();
  form.set("file", file);
  form.set("kind", kind);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed.");
  return data as Uploaded;
}
