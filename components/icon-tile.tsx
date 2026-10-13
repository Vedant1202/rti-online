import type { LucideIcon } from "lucide-react";

export type TileTone = "indigo" | "saffron" | "teal" | "rose";

const TONE: Record<TileTone, string> = {
  indigo: "bg-tile-indigo-bg text-tile-indigo-fg",
  saffron: "bg-tile-saffron-bg text-tile-saffron-fg",
  teal: "bg-tile-teal-bg text-tile-teal-fg",
  rose: "bg-tile-rose-bg text-tile-rose-fg",
};

const SIZE = { sm: "size-9 rounded-lg", md: "size-11 rounded-xl", lg: "size-14 rounded-2xl" } as const;
const ICON = { sm: 18, md: 22, lg: 28 } as const;

/** A lucide icon on a soft coloured tile. Decorative: the text beside it carries the meaning. */
export function IconTile({ icon: Icon, tone = "indigo", size = "md" }: { icon: LucideIcon; tone?: TileTone; size?: keyof typeof SIZE }) {
  return (
    <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center ${SIZE[size]} ${TONE[tone]}`}>
      <Icon size={ICON[size]} strokeWidth={2} />
    </span>
  );
}
