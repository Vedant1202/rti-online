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

export default async function NewAppealPage(props: PageProps<"/appeals/new/[requestId]">) {
  const { requestId } = await props.params;
  const user = await requirePageUser(`/appeals/new/${requestId}`, ["citizen"]);
  const now = await getNow();
  const db = await getDb();
  const [req] = await db.select().from(requests).where(eq(requests.id, requestId));
  if (!req || req.citizenId !== user.id) notFound();

  const window = await getAppealWindow(user, requestId, now);
  if (!window || window.state === "not_yet") {
    return (
      <div className="card grid max-w-xl gap-3">
        <h1 className="text-xl font-bold">You can&apos;t appeal yet</h1>
        <p className="text-sm">
          {window?.opensAt
            ? `The first appeal opens on ${formatDate(window.opensAt)}, when the reply deadline passes. We'll email you that day.`
            : "You can appeal once the authority replies or the reply deadline passes."}
        </p>
        <Link href={`/requests/${requestId}`} className="text-accent">
          Back to the request
        </Link>
      </div>
    );
  }

  const ground = await suggestedGround(user, requestId, now);
  const defaultBody =
    ground === "No response within the time limit"
      ? `I filed RTI request ${req.regNo} on ${formatDate(req.filedAt!)}. The CPIO has not replied within the 30 days allowed by section 7(1). I request that the information be provided.`
      : `I appeal against the response to RTI request ${req.regNo}. `;

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">File a first appeal</h1>
        <p className="text-sm text-muted">
          Against <span className="font-mono">{req.regNo}</span> · {req.subject}. Your details carry over from the request.
        </p>
        {window.state === "open" && (
          <p className="text-sm">Appeal by {formatDate(window.closesAt)} (30 days, RTI Act s.19(1)).</p>
        )}
      </div>
      <AppealForm requestId={requestId} suggested={ground} defaultBody={defaultBody} late={window.state === "late"} />
    </div>
  );
}
