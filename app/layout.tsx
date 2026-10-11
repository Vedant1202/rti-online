import type { Metadata } from "next";
import { HeaderPlaceholder, SiteHeader } from "@/components/site-header";
import { THEME_COOKIE } from "@/lib/theme";
import { Suspense } from "react";
import { AnnouncerProvider } from "@/components/announcer";
import { NavProgress } from "@/components/nav-progress";
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

// Applies the saved theme before the first paint (no flash), without the layout reading cookies on
// the server, which would stop Next.js from showing loading screens instantly.
const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);if(m)document.documentElement.dataset.theme=m[1]}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${body.variable} ${deva.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <AnnouncerProvider>
          <Suspense fallback={<HeaderPlaceholder />}>
            <SiteHeader />
          </Suspense>
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 outline-none"
          >
            {children}
          </main>
          <footer className="border-t border-line bg-surface">
            <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted" data-testid="disclaimer">
              Student project. Not affiliated with DoPT or the Government of India. Do not enter
              real personal information. <a href="/help">Help</a>
            </p>
          </footer>
        </AnnouncerProvider>
      </body>
    </html>
  );
}
