"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { parseLang, type Lang } from "@/lib/prefs";
import { dictFor, type Dict } from ".";

const LangContext = createContext<{ lang: Lang; t: Dict }>({ lang: "en", t: dictFor("en") });

/**
 * Pages render this around their client components with the language they read from the cookie,
 * so the server and the browser render the same text. Without it, components fall back to English.
 */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext value={{ lang, t: dictFor(lang) }}>{children}</LangContext>;
}

export function useT() {
  return useContext(LangContext);
}

const noSubscribe = () => () => {};

/**
 * For the few pieces rendered outside any page (loading skeletons, the progress bar): reads the
 * language the pre-paint script put on <html>. English on the server, so hydration always matches.
 */
export function useDocumentDict(): Dict {
  const lang = useSyncExternalStore(noSubscribe, () => parseLang(document.documentElement.lang), () => "en" as const);
  return dictFor(lang);
}
