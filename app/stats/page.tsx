import { getNow } from "@/lib/clock";
import { authorityStats } from "@/lib/stats";
import { getDict } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const stats = await authorityStats(await getNow());
  const { t } = await getDict();
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">{t.stats.title}</h1>
        <p className="max-w-2xl text-sm text-muted">{t.stats.intro}</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="p-3">{t.stats.authority}</th>
              <th className="p-3 text-right">{t.stats.requests}</th>
              <th className="p-3 text-right">{t.stats.answered}</th>
              <th className="p-3">{t.stats.median}</th>
              <th className="p-3 text-right">{t.stats.overdue}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((r) => (
              <tr key={r.code} className="border-b border-line last:border-0">
                <td className="p-3">
                  <span className="font-semibold">{r.name}</span>
                  <span className="block text-xs text-muted">{r.ministry}</span>
                </td>
                <td className="p-3 text-right tabular-nums">{r.total}</td>
                <td className="p-3 text-right tabular-nums">{r.answered}</td>
                <td className="p-3">
                  {r.medianDays === null ? (
                    <span className="text-muted">{t.stats.noReplies}</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="relative h-2 w-24 rounded-full bg-line" aria-hidden="true">
                        <span
                          className={`absolute inset-y-0 left-0 rounded-full ${r.medianDays > 30 ? "bg-danger" : "bg-ok"}`}
                          style={{ width: `${Math.min(100, (r.medianDays / 30) * 100)}%` }}
                        />
                      </span>
                      <span className="tabular-nums">{fmt(t.stats.days, { n: r.medianDays })}</span>
                    </span>
                  )}
                </td>
                <td className={`p-3 text-right tabular-nums ${r.overduePct && r.overduePct > 0 ? "text-danger" : ""}`}>
                  {r.overduePct === null ? "–" : `${r.overduePct}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
