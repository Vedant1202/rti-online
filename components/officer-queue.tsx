import Link from "next/link";
import { Pill } from "./pill";
import type { Tone } from "@/lib/status";

export type QueueItem = {
  id: string;
  href: string;
  regNo: string | null;
  subject: string;
  badge: { tone: Tone; text: string } | null;
  meta?: string;
};

export function OfficerQueue({ title, items, empty }: { title: string; items: QueueItem[]; empty: string }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-bold">
        {title} <span className="font-normal text-muted">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="card text-sm text-muted">{empty}</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={i.href} className="card flex flex-wrap items-center justify-between gap-3 hover:border-accent">
                <span className="grid min-w-0">
                  <span className="truncate font-semibold">{i.subject}</span>
                  <span className="text-xs text-muted">
                    <span className="font-mono">{i.regNo}</span>
                    {i.meta && ` · ${i.meta}`}
                  </span>
                </span>
                {i.badge && <Pill tone={i.badge.tone}>{i.badge.text}</Pill>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
