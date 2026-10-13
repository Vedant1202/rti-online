"use client";

import { useDocumentDict } from "@/lib/i18n/client";

/** "Loading…" for screen readers, in the visitor's language. */
export function LoadingStatus() {
  const t = useDocumentDict();
  return (
    <span className="sr-only" role="status">
      {t.a11y.loading}
    </span>
  );
}
