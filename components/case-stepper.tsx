import { Check, X } from "lucide-react";
import type { RequestStatus } from "@/lib/contract";
import { STAGES, stageFor } from "@/lib/progress";
import { fmt, type Dict } from "@/lib/i18n";

const CURRENT_TONE = {
  neutral: "border-muted bg-muted text-surface",
  info: "border-accent bg-accent text-accent-ink",
  warn: "border-warn bg-warn text-surface",
  danger: "border-danger bg-danger text-surface",
  ok: "border-ok bg-ok text-surface",
} as const;

/** Filed → With officer → Reply → Appeal → Decided, with the current step marked for screen readers. */
export function CaseStepper({ status, appealStatus, t }: { status: RequestStatus; appealStatus?: RequestStatus | null; t: Dict }) {
  const { index, tone, waitingForYou, closed } = stageFor(status, appealStatus);
  return (
    <ol aria-label={t.case.progress} className="grid grid-cols-5 gap-1" data-testid="case-stepper">
      {STAGES.map((stage, i) => {
        const done = i < index || (closed && i === index);
        const current = i === index && !done;
        return (
          <li key={stage} aria-current={current ? "step" : undefined} className="relative grid justify-items-center gap-1 text-center">
            {i > 0 && (
              <span aria-hidden="true" className="absolute right-1/2 top-4 h-1 w-full -translate-y-1/2 rounded-full bg-line">
                {i <= index && (
                  <span
                    className="bg-brand absolute inset-0 origin-left rounded-full"
                    style={{ animation: `grow-x 420ms ease-out ${i * 90}ms both` }}
                  />
                )}
              </span>
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 grid size-8 place-items-center rounded-full border-2 text-sm font-bold ${
                current ? CURRENT_TONE[tone] : done ? "bg-brand border-transparent text-hero-ink" : "border-line bg-surface text-muted"
              }`}
            >
              {done ? <Check size={16} /> : current && tone === "danger" ? <X size={16} /> : i + 1}
            </span>
            <span className={`text-xs leading-tight ${current ? "font-semibold" : done ? "" : "text-muted"}`}>
              <span className="sr-only">{fmt(t.case.stepOf, { n: i + 1, total: STAGES.length })}, </span>
              {t.case.stages[stage]}
              {done && <span className="sr-only">, {t.case.done}</span>}
              {current && <span className="sr-only">, {t.case.current}</span>}
              {current && waitingForYou && (
                <span className="mt-0.5 block rounded-full bg-warn/10 px-1.5 py-0.5 font-semibold text-warn">{t.case.waitingForYou}</span>
              )}
              {closed && i === index && <span className="mt-0.5 block text-muted">{t.case.closed}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
