"use client";

import { useState } from "react";
import { ErrorText, useAction } from "@/components/use-action";
import { PdfUpload } from "@/components/pdf-upload";
import type { Uploaded } from "@/lib/upload-client";

type Tab = "reply" | "reject";

export function CpioActions({ requestId }: { requestId: string }) {
  const { run, busy, error } = useAction();
  const [tab, setTab] = useState<Tab>("reply");
  const [body, setBody] = useState("");
  const [doc, setDoc] = useState<Uploaded | null>(null);
  const [reason, setReason] = useState("");

  const tabs: { id: Tab; label: string }[] = [
    { id: "reply", label: "Reply" },
    { id: "reject", label: "Reject" },
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "btn" : "btn-ghost"} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "reply" && (
        <div className="grid gap-3">
          <label className="label" htmlFor="reply-body">
            Reply to the applicant
          </label>
          <textarea id="reply-body" className="input min-h-32" value={body} onChange={(e) => setBody(e.target.value)} />
          <PdfUpload label="Reply document" kind="reply" value={doc} onChange={setDoc} />
          <button
            className="btn w-fit"
            disabled={busy || !body.trim()}
            onClick={() => run(`/api/requests/${requestId}/reply`, { body, documentId: doc?.id })}
          >
            Send reply
          </button>
        </div>
      )}

      {tab === "reject" && (
        <div className="grid gap-3">
          <label className="label" htmlFor="reject-reason">
            Reason for rejection (cite the exemption, e.g. section 8(1)(j))
          </label>
          <textarea id="reject-reason" className="input min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button
            className="btn w-fit bg-danger"
            disabled={busy || !reason.trim()}
            onClick={() => run(`/api/requests/${requestId}/reject`, { reason })}
          >
            Reject request
          </button>
        </div>
      )}
      <ErrorText error={error} />
    </div>
  );
}
