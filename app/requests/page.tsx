import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guard";
import { getNow } from "@/lib/clock";
import { listCitizenRequests } from "@/lib/services/views";
import { STATUS } from "@/lib/status";
import { Pill } from "@/components/pill";
import { ClockBadge } from "@/components/clock-badge";
import { formatDate } from "@/lib/format";
import { getDict } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";

export default async function MyRequestsPage() {
  const user = await requirePageUser("/requests", ["citizen"]);
  const list = await listCitizenRequests(user, await getNow());
  const { t } = await getDict();
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.myRequests.title}</h1>
        <Link href="/requests/new" className="btn">
          {t.myRequests.file}
        </Link>
      </div>
      {list.length === 0 ? (
        <div className="card grid gap-2">
          <p className="font-semibold">{t.myRequests.none}</p>
          <p className="text-sm text-muted">{t.myRequests.noneText}</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {list.map((r) => (
            <li key={r.id}>
              <Link
                href={`/requests/${r.id}`}
                className="card flex flex-wrap items-center justify-between gap-3 hover:border-accent"
              >
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate font-semibold">{r.subject}</span>
                  <span className="text-xs text-muted">
                    {r.authority} ·{" "}
                    {r.regNo ? (
                      <span className="font-mono">{r.regNo}</span>
                    ) : (
                      fmt(t.myRequests.started, { date: formatDate(r.createdAt, t.meta.locale) })
                    )}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <Pill tone={STATUS[r.status].tone}>{t.status[r.status]}</Pill>
                  <ClockBadge clock={r.reply} t={t} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
