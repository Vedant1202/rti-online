"use client";

import { usePathname } from "next/navigation";
import { FilePlus2, HelpCircle, Home, ListChecks } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { NavLink } from "./nav-link";

const TAB =
  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs text-muted aria-[current=page]:font-semibold aria-[current=page]:text-accent aria-[current=page]:before:absolute aria-[current=page]:before:inset-x-6 aria-[current=page]:before:top-0 aria-[current=page]:before:h-0.5 aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-accent";

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
            <Home size={22} aria-hidden="true" /> {t.nav.home}
          </NavLink>
        </li>
        <li>
          <NavLink href="/requests/new" exact className={TAB}>
            <FilePlus2 size={22} aria-hidden="true" /> {t.nav.fileShort}
          </NavLink>
        </li>
        <li>
          <NavLink href="/requests" exact className={TAB}>
            <ListChecks size={22} aria-hidden="true" /> {t.nav.myRequests}
          </NavLink>
        </li>
        <li>
          <NavLink href="/help" className={TAB}>
            <HelpCircle size={22} aria-hidden="true" /> {t.nav.help}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
