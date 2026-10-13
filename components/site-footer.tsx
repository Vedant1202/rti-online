import Link from "next/link";
import { Landmark } from "lucide-react";
import { getDict } from "@/lib/i18n/server";
import { en } from "@/lib/i18n/en";
import type { Dict } from "@/lib/i18n";

function FooterContent({ t }: { t: Dict }) {
  const links = [
    { href: "/", label: t.nav.home },
    { href: "/requests/new", label: t.nav.file },
    { href: "/stats", label: t.nav.stats },
    { href: "/help", label: t.nav.help },
  ];
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-[1fr_auto] md:items-start">
        <div className="grid gap-2">
          <p className="inline-flex items-center gap-2.5 font-display text-base font-bold">
            <span aria-hidden="true" className="bg-brand inline-grid size-7 place-items-center rounded-lg text-hero-ink">
              <Landmark size={16} />
            </span>
            {t.nav.brand} <span className="font-sans font-normal text-muted">{t.nav.brandTag}</span>
          </p>
          <p className="max-w-md text-sm text-muted">{t.footer.tagline}</p>
        </div>
        <nav aria-label={t.footer.nav}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-ink hover:text-accent">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="border-t border-line pt-4 text-xs text-muted md:col-span-2" data-testid="disclaimer">
          {t.footer.disclaimer} <Link href="/help">{t.footer.help}</Link>
        </p>
      </div>
    </footer>
  );
}

/** Reads the language cookie, so the root layout renders it inside Suspense. */
export async function SiteFooter() {
  const { t } = await getDict();
  return <FooterContent t={t} />;
}

export function FooterPlaceholder() {
  return <FooterContent t={en} />;
}
