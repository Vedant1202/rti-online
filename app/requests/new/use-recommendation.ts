"use client";

import { useEffect, useRef, useState } from "react";
import { useAnnounce } from "@/components/announcer";

export type Recommendation = { authorityId: string | null; reason: string | null };
type State = { loading: boolean; result: Recommendation | null; failed: boolean };

/** Asks Gemini for a recommended department once per version of the text, while the step is shown. */
export function useRecommendation(enabled: boolean, subject: string, body: string) {
  const announce = useAnnounce();
  const [state, setState] = useState<State>({ loading: false, result: null, failed: false });
  const requested = useRef<string | null>(null);
  const key = `${subject}\u0000${body}`;

  useEffect(() => {
    if (!enabled || !body.trim() || requested.current === key) return;
    requested.current = key;
    const controller = new AbortController();
    setState({ loading: true, result: null, failed: false });
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
          requested.current = null; // ask again next time the step is shown
          return;
        }
        setState({ loading: false, result: null, failed: true });
      });
    return () => controller.abort();
  }, [enabled, key, subject, body, announce]);

  return state;
}
