/**
 * Interface text, English. This is the source dictionary: hi.ts must have exactly the same keys
 * (its type is Dict, so a missing key fails `npm run typecheck`). Use {name} for values filled in
 * with fmt(). Officer pages, emails and API errors stay in English and don't use this file.
 */
export const en = {
  a11y: {
    skip: "Skip to content",
  },
  bar: {
    notice: "Student rebuild · not an official website",
    noticeShort: "Student rebuild · unofficial",
    textSize: "Text size",
    smaller: "Smaller text",
    defaultSize: "Default text size",
    larger: "Larger text",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    themeLabel: "Theme: {current}. Switch to {next}.",
  },
  nav: {
    main: "Main",
    quick: "Quick navigation",
    brand: "RTI Online",
    brandTag: "Rebuild",
    home: "Home",
    file: "File a request",
    fileShort: "File",
    myRequests: "My requests",
    dashboard: "Dashboard",
    stats: "Reply times",
    help: "Help",
    signIn: "Sign in",
    signOut: "Sign out",
    roles: {
      citizen: "Citizen",
      nodal: "Nodal officer",
      cpio: "CPIO",
      faa: "Appellate authority",
      admin: "Admin",
    },
  },
  footer: {
    disclaimer:
      "Student project. Not affiliated with DoPT or the Government of India. Do not enter real personal information.",
    help: "Help",
  },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dict = Widen<typeof en>;
