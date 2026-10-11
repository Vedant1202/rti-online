"use client";

import { createContext, useCallback, useContext, useState } from "react";

const AnnounceContext = createContext<(message: string) => void>(() => {});

/** Polite screen-reader announcements for things that change without a page load. */
export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const announce = useCallback((text: string) => {
    // Clear first so repeating the same message is announced again.
    setMessage("");
    requestAnimationFrame(() => setMessage(text));
  }, []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div aria-live="polite" role="status" className="sr-only" data-testid="announcer">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}

export const useAnnounce = () => useContext(AnnounceContext);
