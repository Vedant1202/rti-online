import type { Metadata } from "next";
import { HeaderPlaceholder, SiteHeader } from "@/components/site-header";
import { FooterPlaceholder, SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { prefsScript } from "@/lib/prefs";
import { Suspense } from "react";
import { AnnouncerProvider } from "@/components/announcer";
import { NavProgress } from "@/components/nav-progress";
import { Noto_Sans, Noto_Sans_Devanagari, Poppins } from "next/font/google";
import "./globals.css";

// UX4G's base type: Noto Sans, with Noto Sans Devanagari for Hindi.
const body = Noto_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

// Headings: Poppins covers Latin and Devanagari, so Hindi headings match the English ones.
const display = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "devanagari"],
  weight: ["600", "700"],
});

const deva = Noto_Sans_Devanagari({
  variable: "--font-deva",
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "RTI Online Rebuild",
  description: "Student rebuild of the RTI Online portal: file, track and appeal RTI requests.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${body.variable} ${deva.variable} ${display.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans max-md:pb-[calc(4rem+env(safe-area-inset-bottom))]">
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
            className="mx-auto w-full max-w-5xl flex-1 scroll-mt-24 px-4 py-8 outline-none"
          >
            {children}
          </main>
          <Suspense fallback={<FooterPlaceholder />}>
            <SiteFooter />
          </Suspense>
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </AnnouncerProvider>
      </body>
    </html>
  );
}
