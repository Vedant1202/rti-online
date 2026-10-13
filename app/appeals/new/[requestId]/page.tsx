import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requirePageUser } from "@/lib/auth/guard";
import { getNow } from "@/lib/clock";
import { getDb } from "@/lib/db/client";
import { requests } from "@/lib/db/schema";
import { getAppealWindow, suggestedGround } from "@/lib/services/appeals";
import { formatDate } from "@/lib/format";
import { AppealForm } from "./appeal-form";
import { getDict } from "@/lib/i18n/server";
import { LangProvider } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";

export default async function NewAppealPage(props: PageProps<"/appeals/new/[requestId]">) {
  const { requestId } = await props.params;
  const user = await requirePageUser(`/appeals/new/${requestId}`, ["citizen"]);
  const now = await getNow();
  const db = await getDb();
  const [req] = await db.select().from(requests).where(eq(requests.id, requestId));
  if (!req || req.citizenId !== user.id) notFound();

  const window = await getAppealWindow(user, requestId, now);
  const { lang, t } = await getDict();
  const a = t.appeal;
  if (!window || window.state === "not_yet") {
    return (
      <div className="card grid max-w-xl gap-3">
        <h1 className="text-xl font-bold">{a.cantYet}</h1>
        <p className="text-sm">
          {window?.opensAt ? fmt(a.opensOn, { date: formatDate(window.opensAt) }) : a.opensLater}
        </p>
        <Link href={`/requests/${requestId}`} className="text-accent">
          {a.backToRequest}
        </Link>
      </div>
    );
  }

  const ground = await suggestedGround(user, requestId, now);
  const defaultBody =
    ground === "No response within the time limit"
      ? fmt(a.defaultNoResponse, { regNo: req.regNo ?? "", date: formatDate(req.filedAt!) })
      : fmt(a.defaultOther, { regNo: req.regNo ?? "" });
  const [againstBefore, againstAfter] = fmt(a.against, { subject: req.subject }).split("{regNo}");

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">{a.title}</h1>
        <p className="text-sm text-muted">
          {againstBefore}
          <span className="font-mono">{req.regNo}</span>
          {againstAfter}
        </p>
        {window.state === "open" && (
          <p className="text-sm">{fmt(a.appealBy, { date: formatDate(window.closesAt) })}</p>
        )}
      </div>
      <LangProvider lang={lang}>
        <AppealForm
          requestId={requestId}
          suggested={ground}
          defaultBody={defaultBody}
          late={window.state === "late"}
        />
      </LangProvider>
    </div>
  );
}
