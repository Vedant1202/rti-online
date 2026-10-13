import type { Dict } from "@/lib/i18n";

/** Plain-language explanations shared by the info buttons and the Help page live in the dictionary. */
export type HelpKey = keyof Dict["help"]["topics"];

export const HELP_SECTIONS = [
  { heading: "sectionFiling", keys: ["rti", "publicAuthority", "stateBodies", "fee", "bpl", "lifeLiberty", "wordLimit"] },
  { heading: "sectionAfter", keys: ["regNo", "nodal", "cpio", "pausedClock"] },
  { heading: "sectionAppeals", keys: ["firstAppeal", "secondAppeal"] },
] as const satisfies readonly { heading: keyof Dict["help"]; keys: readonly HelpKey[] }[];
