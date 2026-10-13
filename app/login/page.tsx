import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getCurrentUser, homeFor } from "@/lib/auth/rbac";
import { LoginForm } from "./login-form";
import { getDict } from "@/lib/i18n/server";
import { LangProvider } from "@/lib/i18n/client";
import { SignInArt } from "@/components/illustrations";

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const user = await getCurrentUser();
  if (user) redirect(typeof next === "string" ? next : homeFor(user.role));
  const { lang, t } = await getDict();
  return (
    <div
      className="rise grid overflow-hidden rounded-3xl border border-line bg-surface md:grid-cols-[1fr_1.05fr]"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <div data-testid="signin-brand" className="bg-hero grid content-center gap-5 px-6 py-6 md:px-10 md:py-12">
        <p className="font-display text-xl font-bold text-hero-ink md:text-3xl">{t.login.brandTitle}</p>
        <SignInArt className="hidden h-44 w-full md:block" />
        <ul className="hidden gap-3 md:grid">
          {[t.login.reason1, t.login.reason2, t.login.reason3].map((r) => (
            <li key={r} className="flex items-center gap-2.5 text-hero-muted">
              <CheckCircle2 size={20} aria-hidden="true" className="shrink-0 text-hero-ink" />
              {r}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid content-center gap-6 px-6 py-8 md:px-12 md:py-12">
        <h1 className="text-3xl font-bold">{t.login.title}</h1>
        <LangProvider lang={lang}>
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </LangProvider>
      </div>
    </div>
  );
}
