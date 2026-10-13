"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useDocumentDict } from "@/lib/i18n/client";

/**
 * A thin bar at the top of the window while a link navigation is in flight.
 * Starts on a click on an internal link, stops when the new URL has rendered.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);
  const t = useDocumentDict();

  useEffect(() => {
    // The new page has rendered: hide the bar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(false);
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element).closest?.("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setActive(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!active) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-accent/20" data-testid="nav-progress" role="progressbar" aria-label={t.a11y.loadingPage}>
      <div className="nav-progress-bar h-full w-1/3 bg-accent" />
    </div>
  );
}
