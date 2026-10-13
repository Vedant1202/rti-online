import Link from "next/link";
import { AlertTriangle, FileUp, IndianRupee, MailOpen, Scale } from "lucide-react";
import type { NextAction } from "@/lib/next-action";
import { IconTile, type TileTone } from "./icon-tile";
import type { Dict } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import { formatRupees } from "@/lib/rti/fees";
import { formatDate } from "@/lib/format";

type Item = { action: NextAction; subject: string; regNo: string | null };

/** Each kind of action has its own colour: money saffron, documents indigo, replies teal, appeals rose. */
const TONE: Record<NextAction["kind"], TileTone> = {
  pay_fee: "saffron",
  pay_additional: "saffron",
  upload_document: "indigo",
  read_reply: "teal",
  appeal_no_reply: "rose",
};

/** What one action looks like: icon, colour, title, a line of explanation and its buttons. */
export function describeAction(a: NextAction, t: Dict) {
  return { tone: TONE[a.kind], ...describe(a, t) };
}

function describe(a: NextAction, t: Dict) {
  switch (a.kind) {
    case "pay_fee":
      return {
        Icon: IndianRupee,
        title: a.amountPaise ? t.actions.payFeeTitle : t.actions.payFeeBplTitle,
        text: t.actions.payFeeText,
        links: [{ href: a.href, label: a.amountPaise ? fmt(t.actions.payFee, { amount: formatRupees(a.amountPaise) }) : t.actions.fileBpl }],
      };
    case "pay_additional":
      return {
        Icon: IndianRupee,
        title: t.actions.payAdditionalTitle,
        text: t.actions.payAdditionalText,
        links: [{ href: a.href, label: fmt(t.actions.payFee, { amount: formatRupees(a.amountPaise) }) }],
      };
    case "upload_document":
      return { Icon: FileUp, title: t.actions.uploadTitle, text: t.actions.uploadText, links: [{ href: a.href, label: t.actions.upload }] };
    case "read_reply":
      return {
        Icon: MailOpen,
        title: t.actions.readReplyTitle,
        text: fmt(t.actions.readReplyText, { date: formatDate(a.appealBy, t.meta.locale) }),
        links: [
          { href: a.href, label: t.actions.readReply },
          { href: a.appealHref, label: t.actions.appeal, ghost: true },
        ],
      };
    case "appeal_no_reply":
      return {
        Icon: a.late ? AlertTriangle : Scale,
        title: t.actions.noReplyTitle,
        text: a.late ? t.actions.noReplyLateText : fmt(t.actions.noReplyText, { date: formatDate(a.appealBy, t.meta.locale) }),
        links: [{ href: a.appealHref, label: t.actions.fileAppeal }],
      };
  }
}

/** "Needs your action" cards on the citizen's home page. */
export function ActionList({ items, t }: { items: Item[]; t: Dict }) {
  return (
    <ul className="grid gap-3">
      {items.map(({ action, subject, regNo }) => {
        const { Icon, tone, title, text, links } = describeAction(action, t);
        return (
          <li key={`${action.kind}-${action.requestId}`} className="card grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex gap-4">
              <IconTile icon={Icon} tone={tone} />
              <div className="grid gap-0.5">
                <p className="font-display font-semibold">{title}</p>
                <p className="text-sm text-muted">{text}</p>
                <p className="text-sm">
                  {subject}
                  {regNo && <span className="ml-2 font-mono text-xs text-muted">{regNo}</span>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className={"ghost" in l && l.ghost ? "btn-ghost" : "btn"}>
                  {l.label}
                </Link>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
