import { HELP, type HelpKey } from "@/lib/help-content";
import { InfoTip } from "./info-tip";

/** An info button with the shared plain-language explanation for an RTI term. */
export function HelpTip({ topic, align }: { topic: HelpKey; align?: "left" | "right" }) {
  const h = HELP[topic];
  return (
    <InfoTip label={h.title.replace(/\?$/, "")} align={align}>
      {h.body}
    </InfoTip>
  );
}
