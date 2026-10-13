"use client";

import type { HelpKey } from "@/lib/help-content";
import { useT } from "@/lib/i18n/client";
import { InfoTip } from "./info-tip";

/** An info button with the shared plain-language explanation for an RTI term. */
export function HelpTip({ topic, align }: { topic: HelpKey; align?: "left" | "right" }) {
  const h = useT().t.help.topics[topic];
  return (
    <InfoTip label={h.title.replace(/\?$/, "")} align={align}>
      {h.body}
    </InfoTip>
  );
}
