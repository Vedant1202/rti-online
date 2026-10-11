"use client";

import { useState } from "react";
import { ErrorText, useAction } from "@/components/use-action";
import { PdfUpload } from "@/components/pdf-upload";
import type { Uploaded } from "@/lib/upload-client";

export function FaaActions({ appealId, canExtend }: { appealId: string; canExtend: boolean }) {
  const { run, busy, error } = useAction();
  const [order, setOrder] = useState("");
  const [doc, setDoc] = useState<Uploaded | null>(null);
  const [reason, setReason] = useState("");
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="order" className="label">
          Order
        </label>
        <textarea id="order" className="input min-h-32" value={order} onChange={(e) => setOrder(e.target.value)} />
        <PdfUpload label="Signed order" kind="order" value={doc} onChange={setDoc} />
        <button className="btn w-fit" disabled={busy || !order.trim()} onClick={() => run(`/api/appeals/${appealId}/decide`, { order, documentId: doc?.id })}>
          Decide appeal
        </button>
      </div>
      {canExtend && (
        <div className="grid gap-2 border-t border-line pt-4">
          <label htmlFor="extend-reason" className="label">
            Extend to 45 days (reason is recorded, s.19(6))
          </label>
          <textarea id="extend-reason" className="input min-h-16" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn-ghost w-fit" disabled={busy || !reason.trim()} onClick={() => run(`/api/appeals/${appealId}/extend`, { reason })}>
            Extend deadline
          </button>
        </div>
      )}
      <ErrorText error={error} />
    </div>
  );
}
