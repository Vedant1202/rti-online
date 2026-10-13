const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" };
const formatters = new Map<string, { date: Intl.DateTimeFormat; dateTime: Intl.DateTimeFormat }>();

function fmtFor(locale: string) {
  let f = formatters.get(locale);
  if (!f) {
    f = {
      date: new Intl.DateTimeFormat(locale, opts),
      dateTime: new Intl.DateTimeFormat(locale, { ...opts, hour: "numeric", minute: "2-digit" }),
    };
    formatters.set(locale, f);
  }
  return f;
}

/** Dates are stored in UTC and always shown in India Standard Time, in English unless a locale is given. */
export const formatDate = (d: Date, locale = "en-IN") => fmtFor(locale).date.format(d);
export const formatDateTime = (d: Date, locale = "en-IN") => fmtFor(locale).dateTime.format(d);
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
