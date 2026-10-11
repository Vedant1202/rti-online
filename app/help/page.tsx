import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { HELP } from "@/lib/help-content";

export const metadata = { title: "Help · RTI Online Rebuild" };

const SECTIONS: { heading: string; keys: (keyof typeof HELP)[] }[] = [
  { heading: "Filing a request", keys: ["rti", "publicAuthority", "stateBodies", "fee", "bpl", "lifeLiberty", "wordLimit"] },
  { heading: "After you file", keys: ["regNo", "nodal", "cpio", "pausedClock"] },
  { heading: "Appeals", keys: ["firstAppeal", "secondAppeal"] },
];

export default function HelpPage() {
  return (
    <div className="grid max-w-3xl gap-8">
      <div className="grid gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HelpCircle size={24} aria-hidden="true" className="text-accent" /> Help
        </h1>
        <p className="text-muted">
          Short answers about filing RTI requests and appeals. Look for the{" "}
          <span className="font-semibold">i</span> buttons across the site for help in context.
        </p>
      </div>
      {SECTIONS.map((section) => (
        <section key={section.heading} className="grid gap-3" aria-labelledby={`h-${section.keys[0]}`}>
          <h2 id={`h-${section.keys[0]}`} className="text-lg font-bold">
            {section.heading}
          </h2>
          {section.keys.map((k) => (
            <details key={k} className="card group">
              <summary className="cursor-pointer font-semibold">{HELP[k].title}</summary>
              <p className="mt-2 text-sm">{HELP[k].body}</p>
            </details>
          ))}
        </section>
      ))}
      <p className="text-sm text-muted">
        Ready to start? <Link href="/requests/new">File a request</Link>.
      </p>
    </div>
  );
}
