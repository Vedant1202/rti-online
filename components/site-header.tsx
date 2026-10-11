import Link from "next/link";
import { getCurrentUser, homeFor } from "@/lib/auth/rbac";
import { BarChart3, FilePlus2, FileText, LayoutDashboard, LogIn, UserRound, Landmark, HelpCircle } from "lucide-react";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

const ROLE_LABEL = {
  citizen: "Citizen",
  nodal: "Nodal officer",
  cpio: "CPIO",
  faa: "Appellate authority",
  admin: "Admin",
} as const;

export async function SiteHeader() {
  const user = await getCurrentUser();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold">
          <Landmark size={20} aria-hidden="true" className="text-accent" />
          RTI Online <span className="font-normal text-muted">Rebuild</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-4 text-sm">
          {user?.role === "citizen" && (
            <Link href="/requests/new" className="inline-flex items-center gap-1.5">
              <FilePlus2 size={16} aria-hidden="true" /> File a request
            </Link>
          )}
          {user && (
            <Link href={homeFor(user.role)} className="inline-flex items-center gap-1.5">
              {user.role === "citizen" ? <FileText size={16} aria-hidden="true" /> : <LayoutDashboard size={16} aria-hidden="true" />}
              {user.role === "citizen" ? "My requests" : "Dashboard"}
            </Link>
          )}
          <Link href="/stats" className="inline-flex items-center gap-1.5">
            <BarChart3 size={16} aria-hidden="true" /> Reply times
          </Link>
          <Link href="/help" className="inline-flex items-center gap-1.5">
            <HelpCircle size={16} aria-hidden="true" /> Help
          </Link>
          <ThemeToggle initial={theme} />
          {user ? (
            <>
              <span className="inline-flex items-center gap-1 text-muted" title={user.email}>
                <UserRound size={16} aria-hidden="true" />
                {ROLE_LABEL[user.role]}
              </span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="btn">
              <LogIn size={16} aria-hidden="true" /> Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

/** Shown for a moment while the header works out who is signed in. Same size, so nothing jumps. */
export function HeaderPlaceholder() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold">
          <Landmark size={20} aria-hidden="true" className="text-accent" />
          RTI Online <span className="font-normal text-muted">Rebuild</span>
        </Link>
        <div className="skeleton h-9 w-40" aria-hidden="true" />
      </div>
    </header>
  );
}
