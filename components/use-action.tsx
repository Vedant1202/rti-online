"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAnnounce } from "./announcer";

/** Posts JSON to an API route, then refreshes the server-rendered page. */
export function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const announce = useAnnounce();
  async function run(
    url: string,
    body: unknown,
    after?: (data: Record<string, unknown>) => void,
    successMessage = "Done.",
  ) {
    setBusy(true);
    setError(null);
    try {
      const data = await api(url, { body });
      after?.(data);
      announce(successMessage);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      announce((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error };
}

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {error}
    </p>
  );
}
