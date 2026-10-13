import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { en } from "@/lib/i18n/en";
import type { Dict } from "@/lib/i18n";

function FooterContent({ t }: { t: Dict }) {
  return (
    <footer className="border-t border-line bg-surface">
      <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted" data-testid="disclaimer">
        {t.footer.disclaimer} <Link href="/help">{t.footer.help}</Link>
      </p>
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
