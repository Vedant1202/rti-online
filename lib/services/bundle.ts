import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { documents, requestEvents } from "@/lib/db/schema";
import { formatDate, formatDateTime } from "@/lib/format";
import type { User } from "@/lib/auth/rbac";
import { getAppealView } from "./appeals";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const CIC_URL = "https://dsscic.nic.in/online-appeal-application/onlineappealapplication";

/**
 * A print-ready HTML bundle for a second appeal to the CIC: request, replies, first appeal and order.
 * HTML rather than PDF so Hindi and other scripts render correctly; use the browser's "Save as PDF".
 */
export async function buildCaseBundle(user: User, appealId: string, now: Date) {
  const view = await getAppealView(user, appealId, now);
  const db = await getDb();
  const { appeal, original } = view;
  const events = await db
    .select()
    .from(requestEvents)
    .where(eq(requestEvents.requestId, original.id))
    .orderBy(asc(requestEvents.at));
  const docs = await db.select().from(documents).where(inArray(documents.requestId, [original.id, appeal.id]));
  const decided = events.find((e) => e.type === "appeal_decided");
  const decisions = events.filter((e) => e.type === "replied" || e.type === "rejected");

  const section = (title: string, body: string) => `<section><h2>${esc(title)}</h2>${body}</section>`;
  const row = (k: string, v: string) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Case bundle ${esc(appeal.regNo)}</title>
<style>
body{font-family:"Noto Sans","Noto Sans Devanagari",system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#15203a;line-height:1.5}
h1{font-size:1.5rem}h2{font-size:1.1rem;border-bottom:1px solid #ccd;padding-bottom:.25rem;margin-top:2rem}
table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:top;padding:.3rem .5rem;border-bottom:1px solid #e3e6ec}th{width:12rem;color:#5a6479;font-weight:600}
.text{white-space:pre-wrap;border-left:3px solid #ccd;padding-left:.75rem}.note{background:#fff7e6;border:1px solid #e6a955;padding:.75rem;border-radius:6px}
@media print{.noprint{display:none}}
</style></head><body>
<p class="noprint note">Use your browser's Print → Save as PDF to keep this bundle as a PDF.</p>
<h1>Case bundle for second appeal</h1>
<p>Prepared ${esc(formatDate(now))} by RTI Online Rebuild (student project). Not an official document.</p>
${section(
  "Second appeal",
  `<p class="note">File a second appeal with the Central Information Commission within 90 days of the first appeal decision (RTI Act s.19(3))${
    view.secondAppealBy ? `, that is by <strong>${esc(formatDate(view.secondAppealBy))}</strong>` : ""
  }, on the CIC online portal: ${esc(CIC_URL)}</p>`,
)}
${section(
  "RTI request",
  `<table>${row("Registration number", esc(original.regNo))}${row("Public authority", esc(view.authority))}${row(
    "Filed on",
    original.filedAt ? esc(formatDate(original.filedAt)) : "",
  )}${row("Subject", esc(original.subject))}</table><p class="text">${esc(original.body)}</p>`,
)}
${section(
  "CPIO's response",
  decisions.length
    ? decisions
        .map(
          (e) =>
            `<p><strong>${e.type === "replied" ? "Reply" : "Rejection"}</strong>, ${esc(formatDateTime(e.at))}</p><p class="text">${esc(
              e.payload.body ?? e.payload.reason,
            )}</p>`,
        )
        .join("")
    : "<p>No reply was received within the time limit.</p>",
)}
${section(
  "First appeal",
  `<table>${row("Appeal number", esc(appeal.regNo))}${row("Filed on", appeal.filedAt ? esc(formatDate(appeal.filedAt)) : "")}${row(
    "Ground",
    esc(appeal.appealGround),
  )}${appeal.appealDelayReason ? row("Reason for delay", esc(appeal.appealDelayReason)) : ""}</table><p class="text">${esc(appeal.body)}</p>`,
)}
${section(
  "First Appellate Authority's order",
  decided
    ? `<p>${esc(formatDateTime(decided.at))}</p><p class="text">${esc(decided.payload.order)}</p>`
    : "<p>The First Appellate Authority has not decided the appeal.</p>",
)}
${section(
  "Timeline",
  `<table>${events.map((e) => row(formatDateTime(e.at), esc(e.type.replace(/_/g, " ")))).join("")}</table>`,
)}
${section(
  "Documents on file",
  docs.length ? `<ul>${docs.map((d) => `<li>${esc(d.filename)} (${esc(d.kind.replace(/_/g, " "))})</li>`).join("")}</ul>` : "<p>None.</p>",
)}
</body></html>`;

  return { filename: `case-bundle-${(appeal.regNo ?? "appeal").replace(/\//g, "-")}.html`, html };
}
