import Link from "next/link";
import { cookies } from "next/headers";
import { BarChart3, FilePlus2, FileText, HelpCircle, Landmark, LayoutDashboard, LogIn, UserRound } from "lucide-react";
import { getCurrentUser, homeFor } from "@/lib/auth/rbac";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { TEXT_COOKIE, parseTextSize } from "@/lib/prefs";
import { getDict } from "@/lib/i18n/server";
import { LangProvider } from "@/lib/i18n/client";
import { en } from "@/lib/i18n/en";
import type { Dict } from "@/lib/i18n";
import { LogoutButton } from "./logout-button";
import { NavLink } from "./nav-link";
import { UtilityBar, UtilityBarPlaceholder } from "./utility-bar";

const NAV_LINK =
  "inline-flex items-center gap-1.5 border-b-2 border-transparent py-1 hover:text-accent aria-[current=page]:border-accent aria-[current=page]:font-semibold aria-[current=page]:text-accent";

function SkipLink({ t }: { t: Dict }) {
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      {t.a11y.skip}
    </a>
  );
}

function Brand({ t }: { t: Dict }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 font-display text-lg font-bold">
      <span aria-hidden="true" className="bg-brand inline-grid size-8 place-items-center rounded-lg text-hero-ink shadow-sm">
        <Landmark size={18} />
      </span>
      {t.nav.brand} <span className="font-sans font-normal text-muted">{t.nav.brandTag}</span>
    </Link>
  );
}

/** The header row sticks to the top while scrolling, over a light blur. */
const HEADER = "sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md";

/**
 * Skip link, utility bar and one header row. Rendered inside Suspense because it reads cookies;
 * on phones citizens get the rest of the navigation from the bottom tab bar.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const jar = await cookies();
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);
  const textSize = parseTextSize(jar.get(TEXT_COOKIE)?.value);
  const officer = user && user.role !== "citizen";
  // Officer pages stay in English (SPEC v3); citizens and visitors get their chosen language.
  const { lang, t } = officer ? { lang: "en" as const, t: en } : await getDict();
  return (
    <LangProvider lang={lang}>
      <SkipLink t={t} />
      <UtilityBar t={t} theme={theme} textSize={textSize} />
      <header className={HEADER}>
        <div>
          <div
            data-testid="header-row"
            className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2 md:py-3"
          >
            <Brand t={t} />
            <nav aria-label={t.nav.main} className="flex items-center gap-5 text-sm">
              {user?.role === "citizen" && (
                <NavLink href="/requests/new" exact className={`${NAV_LINK} max-md:hidden`}>
                  <FilePlus2 size={16} aria-hidden="true" /> {t.nav.file}
                </NavLink>
              )}
              {user && (
                <NavLink
                  href={homeFor(user.role)}
                  exact={user.role === "citizen"}
                  className={`${NAV_LINK} ${officer ? "" : "max-md:hidden"}`}
                >
                  {officer ? <LayoutDashboard size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                  <span className={officer ? "max-sm:sr-only" : ""}>{officer ? t.nav.dashboard : t.nav.myRequests}</span>
                </NavLink>
              )}
              <NavLink href="/stats" className={`${NAV_LINK} max-md:hidden`}>
                <BarChart3 size={16} aria-hidden="true" /> {t.nav.stats}
              </NavLink>
              <NavLink href="/help" className={`${NAV_LINK} max-md:hidden`}>
                <HelpCircle size={16} aria-hidden="true" /> {t.nav.help}
              </NavLink>
              {user ? (
                <span className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-muted max-md:hidden" title={user.email}>
                    <UserRound size={16} aria-hidden="true" />
                    {t.nav.roles[user.role]}
                  </span>
                  <LogoutButton />
                </span>
              ) : (
                <Link href="/login" className="btn">
                  <LogIn size={16} aria-hidden="true" /> {t.nav.signIn}
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>
    </LangProvider>
  );
}

/** Shown for a moment while the header works out who is signed in. Same size, so nothing jumps. */
export function HeaderPlaceholder() {
  return (
    <>
      <SkipLink t={en} />
      <UtilityBarPlaceholder t={en} />
      <header className={HEADER}>
        <div>
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2 md:py-3">
            <Brand t={en} />
            <div className="skeleton h-11 w-28 md:h-10" aria-hidden="true" />
          </div>
        </div>
      </header>
    </>
  );
}
