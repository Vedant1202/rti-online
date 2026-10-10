import type { Metadata } from "next";
import Link from "next/link";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${deva.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="text-lg font-bold">
              RTI Online <span className="font-normal text-muted">Rebuild</span>
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/requests">My requests</Link>
              <Link href="/stats">Stats</Link>
              <Link href="/login">Sign in</Link>
            </nav>
          </div>
        </header>
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
