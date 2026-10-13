/**
 * Interface text, English. This is the source dictionary: hi.ts must have exactly the same keys
 * (its type is Dict, so a missing key fails `npm run typecheck`). Use {name} for values filled in
 * with fmt(). Officer pages, emails and API errors stay in English and don't use this file.
 */
export const en = {
  a11y: {
    skip: "Skip to content",
  },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dict = Widen<typeof en>;
