import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/rbac";
import { LoginForm } from "./login-form";
import { getDict } from "@/lib/i18n/server";
import { LangProvider } from "@/lib/i18n/client";

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const user = await getCurrentUser();
  if (user) redirect(typeof next === "string" ? next : homeFor(user.role));
  const { lang, t } = await getDict();
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">{t.login.title}</h1>
      <LangProvider lang={lang}>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </LangProvider>
    </div>
  );
}
