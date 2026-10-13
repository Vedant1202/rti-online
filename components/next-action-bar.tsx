import Link from "next/link";
import type { NextAction } from "@/lib/next-action";
import type { Dict } from "@/lib/i18n";
import { describeAction } from "./action-list";
import { IconTile } from "./icon-tile";

/**
 * The owner's next step on a case: pinned above the tab bar on phones, sticky at the top on desktop.
 * On phones the page gets extra bottom padding while it's shown (globals.css), so it never covers the footer.
 */
export function NextActionBar({ action, t }: { action: NextAction; t: Dict }) {
  // On the case page itself, "Read reply" jumps to the timeline instead of reloading the page.
  const a = action.kind === "read_reply" ? { ...action, href: "#timeline" } : action;
  const { Icon, tone, title, text, links } = describeAction(a, t);
  return (
    <section
      aria-label={t.case.nextStep}
      data-testid="next-action"
      className="next-action-bar fixed inset-x-0 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-30 border-t-2 border-saffron bg-surface px-4 py-3 shadow-[0_-4px_12px_rgb(0_0_0/0.08)] md:sticky md:top-20 md:bottom-auto md:rounded-2xl md:border md:border-line md:shadow-[var(--shadow-md)]"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconTile icon={Icon} tone={tone} />
          <div className="grid min-w-0">
            <p className="font-display font-semibold">{title}</p>
            <p className="text-sm text-muted max-sm:hidden">{text}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={"ghost" in l && l.ghost ? "btn-ghost" : "btn"}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
