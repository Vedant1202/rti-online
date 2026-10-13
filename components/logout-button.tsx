"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useT } from "@/lib/i18n/client";

export function LogoutButton() {
  const router = useRouter();
  const { t } = useT();
  return (
    <button
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent md:min-h-0"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut size={16} aria-hidden="true" /> {t.nav.signOut}
    </button>
  );
}
