import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guard";
import { getNow } from "@/lib/clock";
import { getAppealView } from "@/lib/services/appeals";
import { STATUS } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { Pill } from "@/components/pill";
import { Timeline } from "@/components/timeline";
import { FaaActions } from "./faa-actions";
import { HelpTip } from "@/components/help-tip";
import { getDict } from "@/lib/i18n/server";
import { LangProvider } from "@/lib/i18n/client";
import { en } from "@/lib/i18n/en";
import { fmt, plural } from "@/lib/i18n";
import { APPEAL_GROUND_KEY, type AppealGround } from "@/lib/contract";

export default async function AppealPage(props: PageProps<"/appeals/[id]">) {
  const { id } = await props.params;
  const user = await requirePageUser(`/appeals/${id}`);
  const view = await getAppealView(user, id, await getNow());
  const { appeal, clock } = view;
  const isFaa =
    (user.role === "faa" && user.authorityId === appeal.authorityId) || user.role === "admin";
  // Officers see English; the citizen sees their chosen language.
  const { lang, t } = user.role === "citizen" ? await getDict() : { lang: "en" as const, t: en };
  const a = t.appeal;
  const split = (template: string, key: string) => template.split(`{${key}}`);
  const groundKey = APPEAL_GROUND_KEY[appeal.appealGround as AppealGround];

  return (
    <LangProvider lang={lang}>
      <div className="grid gap-6">
        <header className="grid gap-2">
          <Link href={`/requests/${view.original.id}`} className="text-sm text-accent">
            {fmt(a.backRequest, { regNo: view.original.regNo ?? "" })}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{a.heading}</h1>
            <Pill tone={STATUS[appeal.status].tone}>{t.status[appeal.status]}</Pill>
          </div>
          <p className="text-sm text-muted">
            <span className="font-mono" data-testid="appeal-reg-no">
              {appeal.regNo}
            </span>{" "}
            · {view.authority}
          </p>
        </header>

        <section className="card grid gap-2" data-testid="faa-clock">
          {clock.state === "running" && (
            <p className="text-sm">
              {split(a.dueBy, "date")[0]}
              <strong>{formatDate(clock.dueAt, t.meta.locale)}</strong>
              {fmt(split(a.dueBy, "date")[1], {
                days: plural(clock.daysLeft, t.clock.dayOne, t.clock.dayMany),
              })}
              {view.extended ? a.extended : a.canExtend}
            </p>
          )}
          {clock.state === "overdue" && (
            <p className="text-sm text-danger">
              {fmt(a.overdue, { date: formatDate(clock.dueAt, t.meta.locale) })}
            </p>
          )}
          {clock.state === "met" && (
            <p className="text-sm">{fmt(a.decided, { date: formatDate(clock.decidedAt, t.meta.locale) })}</p>
          )}
          {view.secondAppealBy && (clock.state === "met" || clock.state === "overdue") && (
            <p className="text-sm">
              <HelpTip topic="secondAppeal" /> {split(a.secondAppeal, "date")[0]}
              <strong>{formatDate(view.secondAppealBy, t.meta.locale)}</strong>
              {split(split(a.secondAppeal, "date")[1], "portal")[0]}
              <a
                className="text-accent underline"
                href="https://dsscic.nic.in/online-appeal-application/onlineappealapplication"
                target="_blank"
                rel="noreferrer"
              >
                {a.cicPortal}
              </a>
              {split(split(a.secondAppeal, "date")[1], "portal")[1]}
            </p>
          )}
          {(clock.state === "met" || clock.state === "overdue") && (
            <a href={`/api/appeals/${appeal.id}/bundle`} className="btn-ghost w-fit" download>
              {a.bundle}
            </a>
          )}
        </section>

        {isFaa && appeal.status === "appeal_filed" && (
          <section className="card grid gap-3 border-accent">
            <h2 className="font-bold">Decide this appeal</h2>
            <FaaActions appealId={appeal.id} canExtend={clock.canExtend} />
          </section>
        )}

        <section className="card grid gap-2">
          <h2 className="font-bold">{a.section}</h2>
          <p className="text-sm">
            <span className="text-muted">{a.groundLabel}</span>{" "}
            {groundKey ? a.grounds[groundKey] : appeal.appealGround}
          </p>
          <p className="whitespace-pre-wrap text-sm">{appeal.body}</p>
          {appeal.appealDelayReason && (
            <p className="text-sm">
              <span className="text-muted">{a.delayLabel}</span> {appeal.appealDelayReason}
            </p>
          )}
        </section>

        <section className="grid gap-3">
          <h2 className="text-lg font-bold">{a.timeline}</h2>
          <Timeline events={view.events} documents={view.documents} t={t} />
        </section>
      </div>
    </LangProvider>
  );
}
