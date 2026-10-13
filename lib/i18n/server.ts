import { cookies } from "next/headers";
import { LANG_COOKIE, parseLang, type Lang } from "@/lib/prefs";
import { dictFor, type Dict } from ".";

/** The visitor's interface language. Call from pages and Suspense-wrapped components, never the root layout. */
export async function getLang(): Promise<Lang> {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value);
}

export async function getDict(): Promise<{ lang: Lang; t: Dict }> {
  const lang = await getLang();
  return { lang, t: dictFor(lang) };
}
