import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { HELP_SECTIONS } from "@/lib/help-content";
import { getDict } from "@/lib/i18n/server";

export const metadata = { title: "Help · RTI Online Rebuild" };

export default async function HelpPage() {
  const { t } = await getDict();
  const [introBefore, introAfter] = t.help.intro.split("{i}");
  const [readyBefore, readyAfter] = t.help.ready.split("{link}");
  return (
    <div className="grid max-w-3xl gap-8">
      <div className="grid gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HelpCircle size={24} aria-hidden="true" className="text-accent" /> {t.help.title}
        </h1>
        <p className="text-muted">
          {introBefore}
          <span className="font-semibold">i</span>
          {introAfter}
        </p>
      </div>
      {HELP_SECTIONS.map((section) => (
        <section key={section.heading} className="grid gap-3" aria-labelledby={`h-${section.keys[0]}`}>
          <h2 id={`h-${section.keys[0]}`} className="text-lg font-bold">
            {t.help[section.heading]}
          </h2>
          {section.keys.map((k) => (
            <details key={k} className="card group">
              <summary className="cursor-pointer font-semibold">{t.help.topics[k].title}</summary>
              <p className="mt-2 text-sm">{t.help.topics[k].body}</p>
            </details>
          ))}
        </section>
      ))}
      <p className="text-sm text-muted">
        {readyBefore}
        <Link href="/requests/new">{t.help.readyLink}</Link>
        {readyAfter}
      </p>
    </div>
  );
}
