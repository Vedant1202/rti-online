"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE, LANGS, savePref, type Lang } from "@/lib/prefs";
import { useT } from "@/lib/i18n/client";

/** English | हिन्दी. Saves the choice and re-renders the page in that language. */
export function LangSwitch() {
  const router = useRouter();
  const { lang, t } = useT();
  const label: Record<Lang, string> = { en: t.bar.english, hi: t.bar.hindi };
  return (
    <div role="group" aria-label={t.bar.language} className="inline-flex items-center gap-0.5" data-testid="lang-switch">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={lang === l}
          className="min-h-8 rounded px-2 text-xs font-semibold hover:bg-white/15 aria-pressed:bg-bar-ink aria-pressed:text-bar"
          onClick={() => {
            if (l === lang) return;
            savePref(LANG_COOKIE, l);
            document.documentElement.lang = l;
            router.refresh();
          }}
        >
          {label[l]}
        </button>
      ))}
    </div>
  );
}
