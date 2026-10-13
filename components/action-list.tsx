import Link from "next/link";
import { AlertTriangle, FileUp, IndianRupee, MailOpen, Scale } from "lucide-react";
import type { NextAction } from "@/lib/next-action";
import type { Dict } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import { formatRupees } from "@/lib/rti/fees";
import { formatDate } from "@/lib/format";

type Item = { action: NextAction; subject: string; regNo: string | null };

/** What one action looks like: icon, title, a line of explanation and its buttons. */
export function describeAction(a: NextAction, t: Dict) {
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
        const { Icon, title, text, links } = describeAction(action, t);
        return (
          <li key={`${action.kind}-${action.requestId}`} className="card grid gap-3 border-l-4 border-l-saffron sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex gap-3">
              <Icon size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-saffron" />
              <div className="grid gap-0.5">
                <p className="font-semibold">{title}</p>
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
