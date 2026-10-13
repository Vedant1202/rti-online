import Link from "next/link";
import { BadgeCheck, BarChart3, CheckCircle2, ChevronRight, Clock, FilePlus2, Languages, ListChecks, Sparkles } from "lucide-react";
import { IconTile } from "@/components/icon-tile";
import { HeroPreview } from "@/components/hero-preview";
import { AppealArt, PayArt, ReplyArt, WriteArt } from "@/components/illustrations";
import { InfoTip } from "@/components/info-tip";
import { ActionList } from "@/components/action-list";
import { Pill } from "@/components/pill";
import { ClockBadge } from "@/components/clock-badge";
import { getCurrentUser, homeFor } from "@/lib/auth/rbac";
import { getNow } from "@/lib/clock";
import { listCitizenRequests } from "@/lib/services/views";
import { getDict } from "@/lib/i18n/server";
import { LangProvider } from "@/lib/i18n/client";
import { fmt, type Dict } from "@/lib/i18n";
import { STATUS } from "@/lib/status";
import type { User } from "@/lib/auth/rbac";

export default async function Home() {
  const user = await getCurrentUser();
  const { lang, t } = await getDict();
  if (user?.role === "citizen") return <CitizenHome user={user} t={t} />;
  return (
    <LangProvider lang={lang}>
      <div className="grid gap-12">
        {user && (
          <p className="card flex flex-wrap items-center justify-between gap-3" role="note">
            <span>{fmt(t.home.officerBanner, { role: t.nav.roles[user.role] })}</span>
            <Link href={homeFor(user.role)} className="btn">
              {t.home.openQueue} <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </p>
        )}
        <Hero t={t} />
        <WhyBetter t={t} />
        <HowItWorks t={t} />
        <Link href="/stats" className="rise rise-3 card flex items-center justify-between gap-3">
          <span className="flex items-center gap-4">
            <IconTile icon={BarChart3} tone="teal" />
            <span className="grid">
              <span className="font-display font-semibold">{t.home.statsTitle}</span>
              <span className="text-sm text-muted">{t.home.statsText}</span>
            </span>
          </span>
          <ChevronRight size={18} aria-hidden="true" className="text-muted" />
        </Link>
      </div>
    </LangProvider>
  );
}

function Hero({ t }: { t: Dict }) {
  return (
    <section
      data-testid="hero"
      className="bg-hero rise relative grid items-center gap-10 overflow-hidden rounded-3xl px-6 py-10 sm:px-10 md:grid-cols-[1.15fr_0.85fr] md:py-14"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <div className="grid gap-5">
        <p className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-hero-ink ring-1 ring-white/25">
          {t.home.eyebrow}
        </p>
        <h1 className="text-[2.375rem] leading-[1.08] font-bold text-balance text-hero-ink md:text-6xl">
          {t.home.title}{" "}
          <InfoTip label={t.home.rtiLabel} onDark>
            {t.home.rtiTip}
          </InfoTip>
        </h1>
        <p className="max-w-xl text-base text-hero-muted md:text-lg">{t.home.lead}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/requests/new" className="btn-light">
            <FilePlus2 size={18} aria-hidden="true" /> {t.home.file}
          </Link>
          <Link href="/requests" className="btn-outline-light">
            <ListChecks size={18} aria-hidden="true" /> {t.home.track}
          </Link>
        </div>
      </div>
      <HeroPreview t={t} />
    </section>
  );
}

function WhyBetter({ t }: { t: Dict }) {
  const h = t.home;
  const items = [
    { icon: Sparkles, tone: "indigo" as const, title: h.whyAiTitle, text: h.whyAiText },
    { icon: BadgeCheck, tone: "saffron" as const, title: h.whyNumberTitle, text: h.whyNumberText },
    { icon: Clock, tone: "teal" as const, title: h.whyNextTitle, text: h.whyNextText },
    { icon: Languages, tone: "rose" as const, title: h.whyHindiTitle, text: h.whyHindiText },
  ];
  return (
    <section className="rise rise-1 grid gap-5" aria-labelledby="why-heading">
      <h2 id="why-heading" className="text-2xl font-bold">
        {h.why}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon, tone, title, text }) => (
          <li key={title} className="card grid content-start gap-3">
            <IconTile icon={icon} tone={tone} />
            <span className="font-display text-base font-semibold">{title}</span>
            <span className="text-sm text-muted">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HowItWorks({ t }: { t: Dict }) {
  const s = t.home.steps;
  const steps = [
    { Art: WriteArt, title: s.writeTitle, text: s.writeText },
    { Art: PayArt, title: s.payTitle, text: s.payText },
    { Art: ReplyArt, title: s.replyTitle, text: s.replyText },
    { Art: AppealArt, title: s.appealTitle, text: s.appealText },
  ];
  return (
    <section className="rise rise-2 grid gap-5" aria-labelledby="how-heading">
      <h2 id="how-heading" className="text-2xl font-bold">
        {t.home.howItWorks}
      </h2>
      <div className="relative">
        <div aria-hidden="true" className="bg-brand absolute top-9 right-[12%] left-[12%] hidden h-0.5 opacity-40 lg:block" />
        <ol aria-label={t.home.howItWorks} className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ Art, title, text }, i) => (
            <li key={title} className="card grid content-start justify-items-start gap-2">
              <span className="bg-brand relative z-10 grid size-8 place-items-center rounded-full text-sm font-bold text-hero-ink" aria-hidden="true">
                {i + 1}
              </span>
              <Art className="h-24 w-full" />
              <span className="font-display font-semibold">{title}</span>
              <span className="text-sm text-muted">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

async function CitizenHome({ user, t }: { user: User; t: Dict }) {
  const list = await listCitizenRequests(user, await getNow());
  const actions = list.flatMap((r) =>
    r.actions.map((action) => ({ action, subject: r.subject, regNo: r.regNo })),
  );
  const active = list
    .filter((r) => !["closed_unpaid", "appeal_decided"].includes(r.status))
    .slice(0, 5);
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
            <span
              className="rounded-full bg-saffron px-2 text-xs font-bold text-surface"
              aria-hidden="true"
            >
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
              <p className="text-sm text-muted">
                {list.length ? t.home.noActionsText : t.home.noneText}
              </p>
            </div>
          </div>
        )}
      </section>

      {active.length > 0 && (
        <section
          className="grid gap-3"
          aria-labelledby="progress-heading"
          data-testid="in-progress"
        >
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
                <Link
                  href={`/requests/${r.id}`}
                  className="card flex flex-wrap items-center justify-between gap-3 py-3 hover:border-accent"
                >
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate font-semibold">{r.subject}</span>
                    <span className="truncate text-xs text-muted">{r.authority}</span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <Pill tone={STATUS[r.status].tone}>{t.status[r.status]}</Pill>
                    <ClockBadge clock={r.reply} t={t} />
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
