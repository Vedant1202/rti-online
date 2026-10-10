"use client";

import { useState } from "react";
import { ErrorText, useAction } from "@/components/use-action";

type Option = { id: string; name: string };

export function NodalActions({
  requestId,
  cpios,
  authorities,
}: {
  requestId: string;
  cpios: Option[];
  authorities: Option[];
}) {
  const { run, busy, error } = useAction();
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"forward" | "transfer">("forward");
  const [toAuthorityId, setTo] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="grid gap-4">
      <div className="flex gap-2" role="tablist">
        <button role="tab" aria-selected={mode === "forward"} className={mode === "forward" ? "btn" : "btn-ghost"} onClick={() => setMode("forward")}>
          Forward to CPIO
        </button>
        <button role="tab" aria-selected={mode === "transfer"} className={mode === "transfer" ? "btn" : "btn-ghost"} onClick={() => setMode("transfer")}>
          Transfer
        </button>
      </div>

      {mode === "forward" ? (
        <fieldset className="grid gap-2">
          <legend className="label mb-1">Which CPIO holds the information? Pick more than one to split the request.</legend>
          {cpios.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(c.id)}
                onChange={(e) => setSelected(e.target.checked ? [...selected, c.id] : selected.filter((x) => x !== c.id))}
              />
              {c.name}
            </label>
          ))}
          <button
            className="btn w-fit"
            disabled={busy || selected.length === 0}
            onClick={() => run(`/api/requests/${requestId}/forward`, { cpioIds: selected })}
          >
            {selected.length > 1 ? `Split into ${selected.length} parts` : "Forward"}
          </button>
        </fieldset>
      ) : (
        <div className="grid gap-2">
          <label className="label" htmlFor="to-authority">
            Transfer to (RTI Act s.6(3))
          </label>
          <select id="to-authority" className="input" value={toAuthorityId} onChange={(e) => setTo(e.target.value)}>
            <option value="">Choose an authority</option>
            {authorities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <label className="label" htmlFor="transfer-note">
            Reason, shown to the applicant
          </label>
          <textarea id="transfer-note" className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
          <button
            className="btn w-fit"
            disabled={busy || !toAuthorityId || !note.trim()}
            onClick={() => run(`/api/requests/${requestId}/transfer`, { toAuthorityId, note })}
          >
            Transfer request
          </button>
        </div>
      )}
      <ErrorText error={error} />
    </div>
  );
}
