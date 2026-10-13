import { BarChart3, Building2, CheckCircle2 } from "lucide-react";
import { getNow } from "@/lib/clock";
import { authorityStats } from "@/lib/stats";
import { getDict } from "@/lib/i18n/server";
import { fmt, type Dict } from "@/lib/i18n";
import { IconTile } from "@/components/icon-tile";
import { Pill } from "@/components/pill";

export const dynamic = "force-dynamic";

type Row = Awaited<ReturnType<typeof authorityStats>>[number];

/** Median reply time as a bar; the colour is backed by words ("within" / "over the limit"). */
function MedianBar({ r, t }: { r: Row; t: Dict }) {
  if (r.medianDays === null) return <span className="text-sm text-muted">{t.stats.noReplies}</span>;
  const over = r.medianDays > 30;
  return (
    <span className="grid gap-1">
      <span className="relative h-2.5 w-full max-w-48 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-danger" : "bg-brand"}`}
          style={{ width: `${Math.min(100, (r.medianDays / 30) * 100)}%` }}
        />
      </span>
      <span className="text-sm">
        <span className="font-semibold tabular-nums">{fmt(t.stats.days, { n: r.medianDays })}</span>{" "}
        <span className={over ? "text-danger" : "text-muted"}>· {over ? t.stats.over : t.stats.within}</span>
      </span>
    </span>
  );
}

function Overdue({ r, t }: { r: Row; t: Dict }) {
  if (r.overduePct === null) return <span className="text-muted">–</span>;
  return <Pill tone={r.overduePct > 0 ? "danger" : "ok"}>{fmt(t.stats.overduePill, { n: r.overduePct })}</Pill>;
}

export default async function StatsPage() {
  const stats = await authorityStats(await getNow());
  const { t } = await getDict();
  const totals = stats.reduce((acc, r) => ({ total: acc.total + r.total, answered: acc.answered + r.answered }), { total: 0, answered: 0 });
  const summary = [
    { icon: Building2, tone: "indigo" as const, label: t.stats.sumAuthorities, value: stats.length },
    { icon: BarChart3, tone: "saffron" as const, label: t.stats.sumRequests, value: totals.total },
    { icon: CheckCircle2, tone: "teal" as const, label: t.stats.sumAnswered, value: totals.answered },
  ];
  return (
    <div className="grid gap-8">
      <div className="rise grid gap-2">
        <h1 className="text-3xl font-bold">{t.stats.title}</h1>
        <p className="max-w-2xl text-muted">{t.stats.intro}</p>
      </div>

      <dl className="rise rise-1 grid gap-4 sm:grid-cols-3">
        {summary.map((s) => (
          <div key={s.label} className="card grid gap-2">
            <dt className="flex items-center gap-3 text-sm text-muted">
              <IconTile icon={s.icon} tone={s.tone} size="sm" />
              {s.label}
            </dt>
            <dd className="font-display text-3xl font-bold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <p data-testid="stats-legend" className="rise rise-2 text-sm text-muted">
        {t.stats.legend}
      </p>

      {/* Desktop: a table. */}
      <div className="rise rise-2 card hidden overflow-x-auto p-0 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
              <th className="p-4">{t.stats.authority}</th>
              <th className="p-4 text-right">{t.stats.requests}</th>
              <th className="p-4 text-right">{t.stats.answered}</th>
              <th className="p-4">{t.stats.median}</th>
              <th className="p-4 text-right">{t.stats.overdue}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((r) => (
              <tr key={r.code} className="border-b border-line last:border-0">
                <td className="p-4">
                  <span className="font-semibold">{r.name}</span>
                  <span className="block text-xs text-muted">{r.ministry}</span>
                </td>
                <td className="p-4 text-right tabular-nums">{r.total}</td>
                <td className="p-4 text-right tabular-nums">{r.answered}</td>
                <td className="p-4">
                  <MedianBar r={r} t={t} />
                </td>
                <td className="p-4 text-right">
                  <Overdue r={r} t={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per authority. */}
      <ul className="grid gap-3 md:hidden">
        {stats.map((r) => (
          <li key={r.code} data-testid="stat-card" className="card grid gap-3">
            <div>
              <p className="font-semibold">{r.name}</p>
              <p className="text-xs text-muted">{r.ministry}</p>
            </div>
            <MedianBar r={r} t={t} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              <span>
                {t.stats.requests}: <span className="font-semibold text-ink tabular-nums">{r.total}</span>
              </span>
              <span>
                {t.stats.answered}: <span className="font-semibold text-ink tabular-nums">{r.answered}</span>
              </span>
              <Overdue r={r} t={t} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
