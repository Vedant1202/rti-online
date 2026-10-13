import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guard";
import { getNow } from "@/lib/clock";
import { listCitizenRequests } from "@/lib/services/views";
import { STATUS } from "@/lib/status";
import { Pill } from "@/components/pill";
import { IconTile, type TileTone } from "@/components/icon-tile";
import { EmptyArt } from "@/components/illustrations";
import { FilePlus2, FileText } from "lucide-react";
import type { Tone } from "@/lib/status";

/** The tile beside each request takes the colour of its status (the pill says it in words). */
const TILE: Record<Tone, TileTone> = {
  info: "indigo",
  warn: "saffron",
  ok: "teal",
  danger: "rose",
  neutral: "indigo",
};
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
      <div className="rise flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t.myRequests.title}</h1>
        <Link href="/requests/new" className="btn">
          <FilePlus2 size={18} aria-hidden="true" /> {t.myRequests.file}
        </Link>
      </div>
      {list.length === 0 ? (
        <div className="rise rise-1 card flex items-center gap-4">
          <EmptyArt className="h-20 w-28 shrink-0" />
          <div className="grid gap-1">
            <p className="font-display font-semibold">{t.myRequests.none}</p>
            <p className="text-sm text-muted">{t.myRequests.noneText}</p>
          </div>
        </div>
      ) : (
        <ul className="rise rise-1 grid gap-3">
          {list.map((r) => (
            <li key={r.id}>
              <Link
                href={`/requests/${r.id}`}
                className="card flex flex-wrap items-center justify-between gap-4"
              >
                <span className="flex min-w-0 items-center gap-4">
                  <IconTile icon={FileText} tone={TILE[STATUS[r.status].tone]} />
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
