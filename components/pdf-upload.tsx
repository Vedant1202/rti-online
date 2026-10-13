"use client";

import { useId, useState } from "react";
import { FileText, Paperclip } from "lucide-react";
import type { DocumentKind } from "@/lib/contract";
import { uploadPdf, type Uploaded } from "@/lib/upload-client";
import { useT } from "@/lib/i18n/client";

export function PdfUpload({
  label,
  kind,
  value,
  onChange,
  required,
}: {
  label: string;
  kind: DocumentKind;
  value: Uploaded | null;
  onChange: (doc: Uploaded | null) => void;
  required?: boolean;
}) {
  const id = useId();
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="label">
        {label} {!required && <span className="font-normal text-muted">{t.upload.optional}</span>}
      </label>
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-1.5">
            <FileText size={16} aria-hidden="true" className="shrink-0 text-muted" />
            <span className="truncate">{value.filename}</span>
          </span>
          <button type="button" className="text-accent" onClick={() => onChange(null)}>
            {t.upload.remove}
          </button>
        </div>
      ) : (
        <input
          id={id}
          type="file"
          accept="application/pdf"
          className="w-full min-w-0 max-w-full text-sm file:mr-3 file:rounded-md file:border file:border-field file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError(null);
            if (file.size > 1_000_000) {
              setError(t.upload.tooBig);
              return;
            }
            setBusy(true);
            try {
              onChange(await uploadPdf(file, kind));
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      <span className="flex items-center gap-1 text-xs text-muted">
        <Paperclip size={12} aria-hidden="true" />
        {busy ? t.upload.uploading : t.upload.hint}
      </span>
      {error && (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
