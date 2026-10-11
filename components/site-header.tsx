import Link from "next/link";
import { getCurrentUser, homeFor } from "@/lib/auth/rbac";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";
import type { Theme } from "@/lib/theme";

const ROLE_LABEL = {
  citizen: "Citizen",
  nodal: "Nodal officer",
  cpio: "CPIO",
  faa: "Appellate authority",
  admin: "Admin",
} as const;

export async function SiteHeader({ theme }: { theme: Theme }) {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          RTI Online <span className="font-normal text-muted">Rebuild</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          {user?.role === "citizen" && <Link href="/requests/new">File a request</Link>}
          {user && <Link href={homeFor(user.role)}>{user.role === "citizen" ? "My requests" : "Dashboard"}</Link>}
          <Link href="/stats">Reply times</Link>
          <ThemeToggle initial={theme} />
          {user ? (
            <>
              <span className="text-muted" title={user.email}>
                {ROLE_LABEL[user.role]}
              </span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="btn">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
