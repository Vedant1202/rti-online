import Link from "next/link";
import { BarChart3, CheckCircle2, ChevronRight, Clock, FilePlus2, IndianRupee, ListChecks, PenLine, Scale } from "lucide-react";
import { InfoTip } from "@/components/info-tip";
import { ActionList } from "@/components/action-list";
import { Pill } from "@/components/pill";
import { ClockBadge } from "@/components/clock-badge";
import { getCurrentUser, homeFor } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { listCitizenRequests } from "@/lib/services/views";
import { getDict } from "@/lib/i18n/server";
import { fmt, type Dict } from "@/lib/i18n";
import { STATUS } from "@/lib/status";
import type { User } from "@/lib/auth/rbac";

export default async function Home() {
  const user = await getCurrentUser();
  const { t } = await getDict();
  if (user?.role === "citizen") return <CitizenHome user={user} t={t} />;
  return (
    <div className="grid gap-10">
      {user && (
        <p className="card flex flex-wrap items-center justify-between gap-3" role="note">
          <span>{fmt(t.home.officerBanner, { role: t.nav.roles[user.role] })}</span>
          <Link href={homeFor(user.role)} className="btn">
            {t.home.openQueue} <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </p>
      )}
      <Hero t={t} />
      <HowItWorks t={t} />
      <Link href="/stats" className="card flex items-center justify-between gap-3 hover:border-accent">
        <span className="flex items-center gap-3">
          <BarChart3 size={22} aria-hidden="true" className="text-accent" />
          <span className="grid">
            <span className="font-semibold">{t.home.statsTitle}</span>
            <span className="text-sm text-muted">{t.home.statsText}</span>
          </span>
        </span>
        <ChevronRight size={18} aria-hidden="true" className="text-muted" />
      </Link>
    </div>
  );
}

function Hero({ t }: { t: Dict }) {
  return (
    <section className="grid gap-4">
      <p className="w-fit rounded-full bg-saffron/10 px-3 py-1 text-xs font-semibold text-saffron">{t.home.eyebrow}</p>
      <h1 className="max-w-3xl text-3xl font-bold text-balance sm:text-4xl">
        {t.home.title}{" "}
        <InfoTip label={t.home.rtiLabel}>{t.home.rtiTip}</InfoTip>
      </h1>
      <p className="max-w-2xl text-muted">{t.home.lead}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/requests/new" className="btn">
          <FilePlus2 size={18} aria-hidden="true" /> {t.home.file}
        </Link>
        <Link href="/requests" className="btn-ghost">
          <ListChecks size={18} aria-hidden="true" /> {t.home.track}
        </Link>
      </div>
    </section>
  );
}

function HowItWorks({ t }: { t: Dict }) {
  const s = t.home.steps;
  const steps = [
    { Icon: PenLine, title: s.writeTitle, text: s.writeText },
    { Icon: IndianRupee, title: s.payTitle, text: s.payText },
    { Icon: Clock, title: s.replyTitle, text: s.replyText },
    { Icon: Scale, title: s.appealTitle, text: s.appealText },
  ];
  return (
    <section className="grid gap-4" aria-labelledby="how-heading">
      <h2 id="how-heading" className="text-xl font-bold">
        {t.home.howItWorks}
      </h2>
      <ol aria-label={t.home.howItWorks} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ Icon, title, text }, i) => (
          <li key={title} className="card grid content-start gap-2">
            <span className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-bold text-accent-ink" aria-hidden="true">
                {i + 1}
              </span>
              <Icon size={20} aria-hidden="true" className="text-accent" />
            </span>
            <span className="font-semibold">{title}</span>
            <span className="text-sm text-muted">{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

async function CitizenHome({ user, t }: { user: User; t: Dict }) {
  const list = await listCitizenRequests(user, await getNow());
  const actions = list.flatMap((r) => r.actions.map((action) => ({ action, subject: r.subject, regNo: r.regNo })));
  const active = list.filter((r) => !["closed_unpaid", "appeal_decided"].includes(r.status)).slice(0, 5);
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.home.welcome}</h1>
        <Link href="/requests/new" className="btn">
          <FilePlus2 size={18} aria-hidden="true" /> {t.home.file}
        </Link>
      </div>

      <section className="grid gap-3" aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="flex items-center gap-2 text-lg font-bold">
          {t.home.needsAction}
          {actions.length > 0 && (
            <span className="rounded-full bg-saffron px-2 text-xs font-bold text-surface" aria-hidden="true">
              {actions.length}
            </span>
          )}
        </h2>
        {actions.length > 0 ? (
          <ActionList items={actions} t={t} />
        ) : (
          <div className="card flex gap-3" data-testid="no-actions">
            <CheckCircle2 size={22} aria-hidden="true" className="shrink-0 text-ok" />
            <div className="grid gap-0.5">
              <p className="font-semibold">{t.home.noActions}</p>
              <p className="text-sm text-muted">{list.length ? t.home.noActionsText : t.home.noneText}</p>
            </div>
          </div>
        )}
      </section>

      {active.length > 0 && (
        <section className="grid gap-3" aria-labelledby="progress-heading" data-testid="in-progress">
          <div className="flex items-center justify-between gap-3">
            <h2 id="progress-heading" className="text-lg font-bold">
              {t.home.inProgress}
            </h2>
            <Link href="/requests" className="text-sm font-semibold text-accent">
              {t.home.seeAll}
            </Link>
          </div>
          <ul className="grid gap-2">
            {active.map((r) => (
              <li key={r.id}>
                <Link href={`/requests/${r.id}`} className="card flex flex-wrap items-center justify-between gap-3 py-3 hover:border-accent">
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate font-semibold">{r.subject}</span>
                    <span className="truncate text-xs text-muted">{r.authority}</span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                    <ClockBadge clock={r.reply} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
