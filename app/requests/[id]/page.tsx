import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guard";
import { getNow } from "@/lib/clock";
import { getCaseView } from "@/lib/services/views";
import { STATUS } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { Pill } from "@/components/pill";
import { ClockBadge, ClockSummary } from "@/components/clock-badge";
import { Timeline } from "@/components/timeline";
import { CitizenActions } from "./citizen-actions";
import { HelpTip } from "@/components/help-tip";
import { OfficerPanel } from "./officer-panel";
import { CaseStepper } from "@/components/case-stepper";
import { NextActionBar } from "@/components/next-action-bar";
import { nextAction } from "@/lib/next-action";
import { getDict } from "@/lib/i18n/server";
import { LangProvider } from "@/lib/i18n/client";
import { en } from "@/lib/i18n/en";
import { fmt } from "@/lib/i18n";

export default async function CasePage(props: PageProps<"/requests/[id]">) {
  const { id } = await props.params;
  const { paid, filed } = await props.searchParams;
  const user = await requirePageUser(`/requests/${id}`);
  const now = await getNow();
  const view = await getCaseView(user, id, now);
  const { root, current } = view;
  const isOwner = user.id === root.citizenId;
  // Officer pages stay in English; the citizen sees their chosen language.
  const { lang, t } = user.role === "citizen" ? await getDict() : { lang: "en" as const, t: en };
  const [bannerBefore, bannerAfter] = t.case.filedBanner.split("{regNo}");
  const action = isOwner
    ? nextAction({
        id: current.id,
        status: current.status,
        bpl: current.bpl,
        openFeePaise: view.demands.find((d) => !d.paidAt)?.totalPaise ?? null,
        appeal: view.clocks.appeal,
        appealed: view.appeals.some((a) => a.parentId === current.id),
        hasParts: view.parts.length > 0,
      })
    : null;

  return (
    <LangProvider lang={lang}>
      <div className="grid gap-6">
        {action && <NextActionBar action={action} t={t} />}
        {(paid || filed) && current.regNo && (
          <p role="status" className="rounded-md bg-ok/10 px-4 py-3 text-sm text-ok">
            {bannerBefore}
            <strong className="font-mono">{current.regNo}</strong>
            {bannerAfter}
          </p>
        )}

        <header className="grid gap-2">
          {view.parent && (
            <Link href={`/requests/${view.parent.id}`} className="text-sm text-accent">
              {fmt(t.case.partOf, { regNo: view.parent.regNo ?? "" })}
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{root.subject}</h1>
            <Pill tone={STATUS[current.status].tone}>{t.status[current.status]}</Pill>
            <ClockBadge clock={view.clocks.reply} t={t} />
          </div>
          <p className="text-sm text-muted">
            {view.authority}
            {current.regNo && (
              <>
                {" · "}
                <span className="font-mono" data-testid="reg-no">
                  {current.regNo}
                </span>
                <HelpTip topic="regNo" />
              </>
            )}
            {view.cpioName && (
              <>
                {" · "}
                {view.cpioName}
                <HelpTip topic="cpio" />
              </>
            )}
          </p>
        </header>

        <section className="card">
          <CaseStepper
            status={current.status}
            appealStatus={
              view.appeals.filter((a) => a.parentId === current.id).at(-1)?.status ?? null
            }
            t={t}
          />
        </section>

        {user.role !== "citizen" && <OfficerPanel user={user} view={view} now={now} />}

        {view.chain.length > 1 && (
          <section className="card grid gap-2">
            <h2 className="font-bold">{t.case.transferred}</h2>
            <ol className="grid gap-1 text-sm">
              {view.chain.map((c, i) => (
                <li key={c.id}>
                  {i + 1}. {c.authority} · <span className="font-mono">{c.regNo}</span>
                  {i === view.chain.length - 1 && (
                    <span className="text-muted"> {t.case.currentCopy}</span>
                  )}
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted">{t.case.transferNote}</p>
          </section>
        )}

        {(view.clocks.reply || current.status === "pending_payment" || isOwner) && (
          <section className="card grid gap-3">
            <ClockSummary
              clock={view.clocks.reply}
              totalDays={current.lifeLiberty === "accepted" ? 2 : 30}
              t={t}
            />
            {isOwner && <CitizenActions view={view} action={action} t={t} />}
          </section>
        )}

        {view.parts.length > 0 && (
          <section className="grid gap-3">
            <h2 className="text-lg font-bold">{fmt(t.case.sentTo, { n: view.parts.length })}</h2>
            <ul className="grid gap-2">
              {view.parts.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/requests/${p.id}`}
                    className="card flex flex-wrap items-center justify-between gap-3 hover:border-accent"
                  >
                    <span className="grid">
                      <span className="font-mono text-sm">{p.regNo}</span>
                      <span className="text-xs text-muted">{p.cpioName}</span>
                    </span>
                    <span className="flex flex-wrap gap-2">
                      <Pill tone={STATUS[p.status].tone}>{t.status[p.status]}</Pill>
                      <ClockBadge clock={p.clocks.reply} t={t} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card grid gap-2">
          <h2 className="font-bold">{t.case.request}</h2>
          <p className="whitespace-pre-wrap text-sm">{root.body}</p>
          {view.documents
            .filter((d) => d.kind === "attachment" && d.requestId === root.id)
            .map((d) => (
              <a
                key={d.id}
                className="text-sm text-accent underline"
                href={`/api/documents/${d.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {d.filename}
              </a>
            ))}
          <p className="text-xs text-muted">
            {fmt(t.case.started, { date: formatDate(root.createdAt, t.meta.locale) })}
          </p>
        </section>

        {view.appeals.length > 0 && (
          <section className="grid gap-2">
            <h2 className="text-lg font-bold">{t.case.appeals}</h2>
            {view.appeals.map((a) => (
              <Link
                key={a.id}
                href={`/appeals/${a.id}`}
                className="card flex flex-wrap items-center justify-between gap-3 hover:border-accent"
              >
                <span className="font-mono text-sm">{a.regNo}</span>
                <Pill tone={STATUS[a.status].tone}>{t.status[a.status]}</Pill>
              </Link>
            ))}
          </section>
        )}

        <section id="timeline" className="grid scroll-mt-28 gap-3">
          <h2 className="text-lg font-bold">{t.case.timeline}</h2>
          <Timeline events={view.timeline} documents={view.documents} t={t} />
        </section>
      </div>
    </LangProvider>
  );
}
