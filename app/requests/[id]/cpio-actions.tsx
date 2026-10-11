"use client";

import { useState } from "react";
import { ErrorText, useAction } from "@/components/use-action";
import { PdfUpload } from "@/components/pdf-upload";
import type { Uploaded } from "@/lib/upload-client";

type Tab = "reply" | "reject" | "fee" | "documents";
type Item = { label: string; quantity: number; rupees: string };

export function CpioActions({ requestId }: { requestId: string }) {
  const { run, busy, error } = useAction();
  const [tab, setTab] = useState<Tab>("reply");
  const [body, setBody] = useState("");
  const [doc, setDoc] = useState<Uploaded | null>(null);
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<Item[]>([{ label: "Photocopies (A4), ₹2 per page", quantity: 1, rupees: "2" }]);
  const [docNote, setDocNote] = useState("");
  const toPaise = (r: string) => Math.round(Number(r) * 100);
  const total = items.reduce((sum, i) => sum + i.quantity * (toPaise(i.rupees) || 0), 0);
  const itemsValid = items.every((i) => i.label.trim() && i.quantity >= 1 && toPaise(i.rupees) >= 0) && total > 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: "reply", label: "Reply" },
    { id: "fee", label: "Ask for fee" },
    { id: "documents", label: "Ask for document" },
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
      {tab === "fee" && (
        <div className="grid gap-3">
          <p className="text-sm text-muted">
            Show how the fee is worked out (RTI Rules 2012, rule 4: ₹2 per A4 page, ₹50 per CD). The
            reply clock pauses until the applicant pays.
          </p>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_6rem_auto] items-end gap-2">
              <label className="grid gap-1 text-xs">
                Item
                <input className="input" value={item.label} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              </label>
              <label className="grid gap-1 text-xs">
                Qty
                <input className="input" type="number" min={1} value={item.quantity} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))} />
              </label>
              <label className="grid gap-1 text-xs">
                ₹ each
                <input className="input" inputMode="decimal" value={item.rupees} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, rupees: e.target.value } : x)))} />
              </label>
              <button type="button" className="text-sm text-danger" disabled={items.length === 1} onClick={() => setItems(items.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="w-fit text-sm text-accent" onClick={() => setItems([...items, { label: "", quantity: 1, rupees: "" }])}>
            Add item
          </button>
          <p className="font-semibold tabular-nums" data-testid="fee-total">Total: ₹{(total / 100).toFixed(total % 100 ? 2 : 0)}</p>
          <button
            className="btn w-fit"
            disabled={busy || !itemsValid}
            onClick={() =>
              run(`/api/requests/${requestId}/fee`, {
                items: items.map((i) => ({ label: i.label, quantity: i.quantity, unitPaise: toPaise(i.rupees) })),
              })
            }
          >
            Send fee request
          </button>
        </div>
      )}

      {tab === "documents" && (
        <div className="grid gap-3">
          <label className="label" htmlFor="doc-note">
            Which document do you need from the applicant?
          </label>
          <textarea id="doc-note" className="input min-h-20" value={docNote} onChange={(e) => setDocNote(e.target.value)} />
          <button className="btn w-fit" disabled={busy || !docNote.trim()} onClick={() => run(`/api/requests/${requestId}/documents`, { note: docNote })}>
            Ask for document
          </button>
        </div>
      )}
      <ErrorText error={error} />
    </div>
  );
}
