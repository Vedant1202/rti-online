import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { authorities, users } from "@/lib/db/schema";
import type { User } from "@/lib/auth/rbac";
import type { CaseView } from "@/lib/services/views";
import { transferClock } from "@/lib/rti/deadlines";
import { formatDate } from "@/lib/format";
import { NodalActions } from "./nodal-actions";
import { CpioActions } from "./cpio-actions";
import { CloseUnpaidButton } from "./close-unpaid";
import { LifeLibertyDecision } from "./life-liberty-decision";
import { DAY_MS } from "@/lib/rti/deadlines";

/** Role-specific actions for officers viewing a case. Later tasks add CPIO actions. */
export async function OfficerPanel({ user, view, now }: { user: User; view: CaseView; now: Date }) {
  const { current } = view;
  const isAuthorityOfficer = user.role === "admin" || user.authorityId === current.authorityId;
  if (!isAuthorityOfficer) return null;

  if ((user.role === "nodal" || user.role === "admin") && current.status === "filed") {
    const db = await getDb();
    const cpios = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.role, "cpio"), eq(users.authorityId, current.authorityId)));
    const others = await db
      .select({ id: authorities.id, name: authorities.name })
      .from(authorities)
      .where(and(eq(authorities.isCentral, true), ne(authorities.id, current.authorityId)));
    const timer = transferClock(current.filedAt!, null, now);
    return (
      <section className="card grid gap-3 border-accent">
        <h2 className="font-bold">Route this request</h2>
        <p className="text-sm text-muted">
          {timer.state === "running"
            ? `Transfer deadline: ${formatDate(timer.dueAt)} (${timer.daysLeft} days left).`
            : timer.state === "overdue"
              ? `The 5-day transfer deadline passed on ${formatDate(timer.dueAt)}.`
              : null}
        </p>
        <NodalActions
          requestId={current.id}
          cpios={cpios.map((c) => ({ id: c.id, name: c.name ?? "CPIO" }))}
          authorities={others}
        />
      </section>
    );
  }
  const isAssignedCpio = user.role === "admin" || current.assignedCpioId === user.id;
  if ((user.role === "cpio" || user.role === "admin") && isAssignedCpio && current.status === "fee_requested") {
    const open = view.demands.find((d) => !d.paidAt);
    const canClose = open ? now.getTime() - open.sentAt.getTime() >= 30 * DAY_MS : false;
    return (
      <section className="card grid gap-3">
        <h2 className="font-bold">Waiting for the additional fee</h2>
        <p className="text-sm text-muted">
          {open ? `Requested on ${formatDate(open.sentAt)}. ` : ""}The reply clock is paused until the applicant pays.
          {canClose ? " It has been unpaid for 30 days, so you can close the request." : " You can close the request after 30 days unpaid."}
        </p>
        <CloseUnpaidButton requestId={current.id} disabled={!canClose} />
      </section>
    );
  }
  if ((user.role === "cpio" || user.role === "admin") && isAssignedCpio && current.status === "documents_requested") {
    return (
      <section className="card grid gap-3">
        <h2 className="font-bold">Waiting for the applicant&apos;s document</h2>
        <CpioActions requestId={current.id} />
      </section>
    );
  }
  if ((user.role === "cpio" || user.role === "admin") && isAssignedCpio && current.status === "forwarded") {
    return (
      <section className="card grid gap-3 border-accent">
        <h2 className="font-bold">Answer this request</h2>
        {current.lifeLiberty === "claimed" && (
          <LifeLibertyDecision requestId={current.id} claim={current.lifeLibertyReason ?? ""} />
        )}
        <CpioActions requestId={current.id} />
      </section>
    );
  }
  return null;
}
