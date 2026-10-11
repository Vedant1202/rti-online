import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { Atkinson_Hyperlegible, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const body = Atkinson_Hyperlegible({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const deva = Noto_Sans_Devanagari({
  variable: "--font-deva",
  subsets: ["devanagari"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "RTI Online Rebuild",
  description: "Student rebuild of the RTI Online portal: file, track and appeal RTI requests.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="en"
      data-theme={theme === "system" ? undefined : theme}
      className={`${body.variable} ${deva.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader theme={theme} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line bg-surface">
          <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted" data-testid="disclaimer">
            Student project. Not affiliated with DoPT or the Government of India. Do not enter real
            personal information.
          </p>
        </footer>
      </body>
    </html>
  );
}
