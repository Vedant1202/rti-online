"use client";

import { useState } from "react";
import { PdfUpload } from "@/components/pdf-upload";
import { ErrorText, useAction } from "@/components/use-action";
import type { Uploaded } from "@/lib/upload-client";
import { useT } from "@/lib/i18n/client";

export function UploadRequested({ requestId, note }: { requestId: string; note: string }) {
  const { run, busy, error } = useAction();
  const { t } = useT();
  const [doc, setDoc] = useState<Uploaded | null>(null);
  return (
    <div id="upload" className="grid scroll-mt-24 gap-3">
      <p className="text-sm">
        <strong>{t.citizen.docAsked}</strong> {note}
      </p>
      <PdfUpload label={t.citizen.docLabel} kind="requested_document" value={doc} onChange={setDoc} required />
      <button className="btn w-fit" aria-busy={busy} disabled={busy || !doc} onClick={() => run(`/api/requests/${requestId}/documents/upload`, { documentId: doc!.id })}>
        {t.citizen.sendDoc}
      </button>
      <ErrorText error={error} />
    </div>
  );
}
