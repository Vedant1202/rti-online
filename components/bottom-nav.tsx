import { getCurrentUser } from "@/lib/auth/rbac";
import { getDict } from "@/lib/i18n/server";
import { LangProvider } from "@/lib/i18n/client";
import { BottomNavBar } from "./bottom-nav-bar";

/** The phone tab bar for citizens and signed-out visitors. Officers keep the header links. */
export async function BottomNav() {
  const user = await getCurrentUser();
  if (user && user.role !== "citizen") return null;
  const { lang } = await getDict();
  return (
    <LangProvider lang={lang}>
      <BottomNavBar />
    </LangProvider>
  );
}
