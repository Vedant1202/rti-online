"use client";

import { usePathname } from "next/navigation";
import { FilePlus2, HelpCircle, Home, ListChecks } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { NavLink } from "./nav-link";

const TAB =
  "group flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs text-muted aria-[current=page]:font-semibold aria-[current=page]:text-accent";
/** The active tab shows a filled pill behind its icon. */
const PILL =
  "grid h-7 w-14 place-items-center rounded-full transition-colors group-aria-[current=page]:bg-tile-indigo-bg group-aria-[current=page]:text-tile-indigo-fg";

/** Thumb-reach navigation for phones. Hidden from 768px up, and on the card checkout. */
export function BottomNavBar() {
  const { t } = useT();
  const pathname = usePathname();
  if (pathname.startsWith("/pay/")) return null;
  return (
    <nav
      aria-label={t.nav.quick}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        <li>
          <NavLink href="/" exact className={TAB}>
            <span data-tab-pill className={PILL}>
              <Home size={20} aria-hidden="true" />
            </span>
            {t.nav.home}
          </NavLink>
        </li>
        <li>
          <NavLink href="/requests/new" exact className={TAB}>
            <span data-tab-pill className={PILL}>
              <FilePlus2 size={20} aria-hidden="true" />
            </span>
            {t.nav.fileShort}
          </NavLink>
        </li>
        <li>
          <NavLink href="/requests" exact className={TAB}>
            <span data-tab-pill className={PILL}>
              <ListChecks size={20} aria-hidden="true" />
            </span>
            {t.nav.myRequests}
          </NavLink>
        </li>
        <li>
          <NavLink href="/help" className={TAB}>
            <span data-tab-pill className={PILL}>
              <HelpCircle size={20} aria-hidden="true" />
            </span>
            {t.nav.help}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
