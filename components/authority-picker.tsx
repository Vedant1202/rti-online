"use client";

import { useId, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Search, Sparkles } from "lucide-react";
import { InfoTip } from "./info-tip";
import { HelpTip } from "./help-tip";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

export type AuthorityOption = { id: string; code: string; name: string; ministry: string; keywords: string[] };

type Props = {
  authorities: AuthorityOption[];
  popular: { code: string; label: string }[];
  value: string | null;
  onChange: (id: string) => void;
  /** Keyword matches from the request text (no AI). */
  suggestions: AuthorityOption[];
  /** The AI recommendation, while it loads and once it's back. */
  ai: { show: boolean; loading: boolean; authority: AuthorityOption | null; reason: string | null };
};

/** Lower-case text to search: name, ministry, code and topics (English and Hindi). */
const haystack = (a: AuthorityOption) => `${a.name} ${a.ministry} ${a.code} ${a.keywords.join(" ")}`.toLowerCase();

/**
 * Picks the public authority: the AI recommendation and keyword suggestions first, six Popular
 * chips, and "Browse all", a searchable list grouped by ministry.
 */
export function AuthorityPicker({ authorities, popular, value, onChange, suggestions, ai }: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();
  const selected = authorities.find((a) => a.id === value) ?? null;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? authorities.filter((a) => haystack(a).includes(q)) : authorities;
    const byMinistry = new Map<string, AuthorityOption[]>();
    for (const a of matches) byMinistry.set(a.ministry, [...(byMinistry.get(a.ministry) ?? []), a]);
    return [...byMinistry.entries()].sort(([x], [y]) => x.localeCompare(y));
  }, [authorities, query]);

  const popularOptions = popular.flatMap((p) => {
    const a = authorities.find((x) => x.code === p.code);
    return a ? [{ ...a, label: p.label }] : [];
  });

  const chip = (a: AuthorityOption, label: string, icon?: React.ReactNode) => (
    <button key={a.id} type="button" className="chip" data-authority-id={a.id} aria-pressed={value === a.id} onClick={() => onChange(a.id)}>
      {icon}
      {label}
    </button>
  );

  return (
    <div className="grid gap-4">
      <h2 className="flex items-center gap-1 text-lg font-bold">
        {t.picker.heading} <HelpTip topic="publicAuthority" />
      </h2>

      {ai.show && (ai.loading || ai.authority) && (
        <div className="grid gap-2" data-testid="ai-recommendation">
          <p className="label flex items-center gap-1.5">
            <Sparkles size={16} aria-hidden="true" className="text-accent" /> {t.picker.recommended}
          </p>
          {ai.loading ? (
            <div className="flex gap-2" aria-busy="true">
              <span className="sr-only" role="status">
                {t.picker.finding}
              </span>
              <span className="skeleton h-9 w-56" aria-hidden="true" />
              <span className="skeleton h-9 w-24" aria-hidden="true" />
            </div>
          ) : (
            ai.authority && (
              <div className="flex flex-wrap items-center gap-2">
                {chip(ai.authority, ai.authority.name, <Sparkles size={14} aria-hidden="true" />)}
                {ai.reason && <InfoTip label={t.picker.whyLabel}>{ai.reason}</InfoTip>}
              </div>
            )
          )}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="grid gap-2" data-testid="suggestions">
          <p className="label">{t.picker.suggested}</p>
          <div className="flex flex-wrap gap-2">{suggestions.map((a) => chip(a, a.name))}</div>
        </div>
      )}

      <div className="grid gap-2">
        <p className="label" id={`${listId}-popular`}>
          {t.picker.popular}
        </p>
        <div role="group" aria-labelledby={`${listId}-popular`} className="flex flex-wrap gap-2">
          {popularOptions.map((a) => chip(a, a.label))}
        </div>
      </div>

      {selected && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-accent/5 px-3 py-2 text-sm" data-testid="selected-authority" aria-live="polite">
          <CheckCircle2 size={16} aria-hidden="true" className="text-accent" />
          <span className="text-muted">{t.picker.selected}</span>
          <strong>{selected.name}</strong>
          <span className="text-xs text-muted">{selected.ministry}</span>
          {ai.authority?.id === selected.id && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent px-2 py-0.5 text-xs font-semibold text-accent">
              <Sparkles size={12} aria-hidden="true" /> {t.picker.recommendedTag}
            </span>
          )}
        </p>
      )}

      <div className="grid gap-3">
        <button
          type="button"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-accent"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen(!open)}
        >
          <ChevronDown size={16} aria-hidden="true" className={open ? "rotate-180" : ""} />
          {fmt(t.picker.browse, { n: authorities.length })}
        </button>
        {open && (
          <div id={listId} className="grid gap-3">
            <div className="relative">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                className="input pl-9"
                placeholder={t.picker.searchPlaceholder}
                aria-label={t.picker.searchLabel}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="grid max-h-[28rem] gap-4 overflow-y-auto pr-1">
              {groups.map(([ministry, list]) => (
                <fieldset key={ministry} className="grid gap-2">
                  <legend className="mb-1 text-xs font-semibold text-muted">{ministry}</legend>
                  {list.map((a) => (
                    <label
                      key={a.id}
                      data-authority-id={a.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${value === a.id ? "border-accent bg-accent/5" : "border-line"}`}
                    >
                      <input type="radio" name="authority" className="mt-1" checked={value === a.id} onChange={() => onChange(a.id)} />
                      <span className="grid">
                        <span className="flex flex-wrap items-center gap-2 font-semibold">
                          {a.name}
                          {ai.authority?.id === a.id && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-accent px-2 py-0.5 text-xs font-semibold text-accent">
                              <Sparkles size={12} aria-hidden="true" /> {t.picker.recommendedTag}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted">{a.ministry}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ))}
              {groups.length === 0 && <p className="text-sm text-muted">{t.picker.noMatch}</p>}
            </div>
          </div>
        )}
        <p className="text-xs text-muted">{t.picker.centralOnly}</p>
      </div>
    </div>
  );
}
