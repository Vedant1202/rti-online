import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guard";
import { getNow } from "@/lib/clock";
import { getAppealView } from "@/lib/services/appeals";
import { STATUS } from "@/lib/status";
import { formatDate, plural } from "@/lib/format";
import { Pill } from "@/components/pill";
import { Timeline } from "@/components/timeline";
import { FaaActions } from "./faa-actions";

export default async function AppealPage(props: PageProps<"/appeals/[id]">) {
  const { id } = await props.params;
  const user = await requirePageUser(`/appeals/${id}`);
  const view = await getAppealView(user, id, await getNow());
  const { appeal, clock } = view;
  const isFaa = (user.role === "faa" && user.authorityId === appeal.authorityId) || user.role === "admin";

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <Link href={`/requests/${view.original.id}`} className="text-sm text-accent">
          ← Request {view.original.regNo}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">First appeal</h1>
          <Pill tone={STATUS[appeal.status].tone}>{STATUS[appeal.status].label}</Pill>
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
            Decision due by <strong>{formatDate(clock.dueAt)}</strong> ({plural(clock.daysLeft, "day")} left)
            {view.extended ? ", extended to 45 days." : ". The authority can extend this once, to 45 days in total."}
          </p>
        )}
        {clock.state === "overdue" && (
          <p className="text-sm text-danger">The decision was due on {formatDate(clock.dueAt)}.</p>
        )}
        {clock.state === "met" && <p className="text-sm">Decided on {formatDate(clock.decidedAt)}.</p>}
        {view.secondAppealBy && (clock.state === "met" || clock.state === "overdue") && (
          <p className="text-sm">
            Not satisfied? File a second appeal with the Central Information Commission by{" "}
            <strong>{formatDate(view.secondAppealBy)}</strong> (90 days, s.19(3)) on the{" "}
            <a className="text-accent underline" href="https://dsscic.nic.in/online-appeal-application/onlineappealapplication" target="_blank" rel="noreferrer">
              CIC online portal
            </a>
            .
          </p>
        )}
      </section>

      {isFaa && appeal.status === "appeal_filed" && (
        <section className="card grid gap-3 border-accent">
          <h2 className="font-bold">Decide this appeal</h2>
          <FaaActions appealId={appeal.id} canExtend={clock.canExtend} />
        </section>
      )}

      <section className="card grid gap-2">
        <h2 className="font-bold">Appeal</h2>
        <p className="text-sm">
          <span className="text-muted">Ground:</span> {appeal.appealGround}
        </p>
        <p className="whitespace-pre-wrap text-sm">{appeal.body}</p>
        {appeal.appealDelayReason && (
          <p className="text-sm">
            <span className="text-muted">Reason for delay:</span> {appeal.appealDelayReason}
          </p>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-bold">Timeline</h2>
        <Timeline events={view.events} documents={view.documents} />
      </section>
    </div>
  );
}
