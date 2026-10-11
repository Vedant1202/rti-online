"use client";

import { useState } from "react";
import { Check, Sparkles, Undo2, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAnnounce } from "@/components/announcer";

/**
 * "Rewrite formally" for the request text. Never replaces the text without the applicant choosing
 * "Use rewrite", and offers Undo afterwards.
 */
export function RewritePanel({
  text,
  onReplace,
  onBusyChange,
}: {
  text: string;
  onReplace: (next: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const announce = useAnnounce();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function rewrite() {
    setBusy(true);
    onBusyChange(true);
    setError(null);
    setPreview(null);
    announce("Rewriting your request formally…");
    try {
      const res = await api<{ rewritten: string }>("/api/ai/rewrite", { body: { text } });
      setPreview(res.rewritten);
      announce("Formal rewrite ready. Review it below.");
    } catch (err) {
      setError((err as Error).message);
      announce((err as Error).message);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <div className="grid gap-2" data-testid="rewrite-panel">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-ghost" onClick={rewrite} aria-busy={busy} disabled={busy || text.trim().length < 10}>
          {!busy && <Sparkles size={16} aria-hidden="true" />}
          {busy ? "Rewriting…" : "Rewrite formally"}
        </button>
        {previous !== null && !preview && (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-accent"
            onClick={() => {
              onReplace(previous);
              setPrevious(null);
              announce("Restored your original text.");
            }}
          >
            <Undo2 size={14} aria-hidden="true" /> Undo rewrite
          </button>
        )}
        <span className="text-xs text-muted">Uses Google Gemini. Your text is sent to Google.</span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {preview && (
        <section className="grid gap-3 rounded-lg border border-accent bg-accent/5 p-3" aria-label="Formal rewrite preview">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-accent">
            <Sparkles size={14} aria-hidden="true" /> Suggested formal version
          </p>
          <p className="whitespace-pre-wrap text-sm" data-testid="rewrite-preview">
            {preview}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPrevious(text);
                onReplace(preview);
                setPreview(null);
                announce("Rewrite applied. You can undo it.");
              }}
            >
              <Check size={16} aria-hidden="true" /> Use rewrite
            </button>
            <button type="button" className="btn-ghost" onClick={() => setPreview(null)}>
              <X size={16} aria-hidden="true" /> Keep mine
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
