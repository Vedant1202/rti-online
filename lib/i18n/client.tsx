"use client";

import { createContext, useContext } from "react";
import type { Lang } from "@/lib/prefs";
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
