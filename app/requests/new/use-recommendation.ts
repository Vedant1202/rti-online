"use client";

import { useEffect, useRef, useState } from "react";
import { useAnnounce } from "@/components/announcer";
import { countWords } from "@/lib/rti/wordcount";

export type Recommendation = { authorityId: string | null; reason: string | null };
type State = { loading: boolean; result: Recommendation | null; failed: boolean };

/** Ask once there's enough to go on, and only after typing pauses, to stay well inside the AI limit. */
export const MIN_WORDS = 8;
export const IDLE_MS = 1500;

/** Asks Gemini for a recommended department once per version of the text, after the citizen stops typing. */
export function useRecommendation(enabled: boolean, subject: string, body: string) {
  const announce = useAnnounce();
  const [state, setState] = useState<State>({ loading: false, result: null, failed: false });
  const requested = useRef<string | null>(null);
  const key = `${subject}\u0000${body}`;
  const ready = enabled && countWords(body) >= MIN_WORDS;

  useEffect(() => {
    if (!ready || requested.current === key) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      requested.current = key;
      setState((s) => ({ ...s, loading: true, failed: false }));
      announce("Finding the best department for your request…");
      fetch("/api/ai/suggest-authority", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, body }),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("unavailable");
          const result = (await res.json()) as Recommendation;
          setState({ loading: false, result, failed: false });
          announce(result.authorityId ? "A recommended department is shown." : "No department recommendation. Choose from the list.");
        })
        .catch((err) => {
          if ((err as Error).name === "AbortError") {
            if (requested.current === key) requested.current = null; // ask again for this text later
            return;
          }
          setState({ loading: false, result: null, failed: true });
        });
    }, IDLE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [ready, key, subject, body, announce]);

  return state;
}
