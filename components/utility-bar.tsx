import type { Dict } from "@/lib/i18n";
import type { Theme } from "@/lib/theme";
import type { TextSize } from "@/lib/prefs";
import { ThemeToggle } from "./theme-toggle";
import { TextSizeControl } from "./text-size";
import { LangSwitch } from "./lang-switch";

/**
 * UX4G-style top strip. Where UX4G says "Government of India", we say the site is unofficial
 * (SPEC: never brand as government). Holds the language, text-size and theme controls.
 */
export function UtilityBar({ t, theme, textSize }: { t: Dict; theme: Theme; textSize: TextSize }) {
  return (
    <div data-testid="utility-bar">
      <div className="bg-bar text-bar-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-1 text-xs">
          <p>
            <span className="sm:hidden">{t.bar.noticeShort}</span>
            <span className="hidden sm:inline">{t.bar.notice}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <LangSwitch />
            <TextSizeControl initial={textSize} />
            <ThemeToggle initial={theme} />
          </div>
        </div>
      </div>
      <div className="tricolour" aria-hidden="true" />
    </div>
  );
}

/** Same height as the real bar, so nothing jumps while the header loads. */
export function UtilityBarPlaceholder({ t }: { t: Dict }) {
  return (
    <div>
      <div className="bg-bar text-bar-ink">
        <div className="mx-auto flex min-h-10 max-w-5xl items-center px-4 py-1 text-xs">
          <p>
            <span className="sm:hidden">{t.bar.noticeShort}</span>
            <span className="hidden sm:inline">{t.bar.notice}</span>
          </p>
        </div>
      </div>
      <div className="tricolour" aria-hidden="true" />
    </div>
  );
}
