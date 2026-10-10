"use client";

import { useState } from "react";
import { PdfUpload } from "@/components/pdf-upload";
import { ErrorText, useAction } from "@/components/use-action";
import type { Uploaded } from "@/lib/upload-client";

export function UploadRequested({ requestId, note }: { requestId: string; note: string }) {
  const { run, busy, error } = useAction();
  const [doc, setDoc] = useState<Uploaded | null>(null);
  return (
    <div className="grid gap-3">
      <p className="text-sm">
        <strong>The CPIO asked for a document:</strong> {note}
      </p>
      <PdfUpload label="Requested document" kind="requested_document" value={doc} onChange={setDoc} required />
      <button className="btn w-fit" disabled={busy || !doc} onClick={() => run(`/api/requests/${requestId}/documents/upload`, { documentId: doc!.id })}>
        Send document
      </button>
      <ErrorText error={error} />
    </div>
  );
}
