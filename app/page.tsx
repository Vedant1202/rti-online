import Link from "next/link";
import { InfoTip } from "@/components/info-tip";
import { BarChart3, FilePlus2, ListChecks } from "lucide-react";

export default function Home() {
  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h1 className="text-3xl font-bold text-balance">
          Ask the central government for information{" "}
          <InfoTip label="Right to Information">
            The Right to Information Act, 2005 lets any Indian citizen ask a public authority for
            information it holds. Central ministries must reply within 30 days (section 7).
          </InfoTip>
        </h1>
        <p className="max-w-2xl text-muted">
          File a Right to Information request with any central ministry, pay the ₹10 fee, and track
          the reply on one timeline. If you get no reply in 30 days, appeal in one click.
        </p>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <Link href="/requests/new" className="card grid gap-1 hover:border-accent">
          <span className="flex items-center gap-2 font-bold">
            <FilePlus2 size={20} aria-hidden="true" className="text-accent" /> File a request
          </span>
          <span className="text-sm text-muted">Write in English, Hindi or your language.</span>
        </Link>
        <Link href="/requests" className="card grid gap-1 hover:border-accent">
          <span className="flex items-center gap-2 font-bold">
            <ListChecks size={20} aria-hidden="true" className="text-accent" /> Track your requests
          </span>
          <span className="text-sm text-muted">See due dates, replies and fees.</span>
        </Link>
        <Link href="/stats" className="card grid gap-1 hover:border-accent">
          <span className="flex items-center gap-2 font-bold">
            <BarChart3 size={20} aria-hidden="true" className="text-accent" /> Reply times
          </span>
          <span className="text-sm text-muted">How fast each ministry answers.</span>
        </Link>
      </section>
    </div>
  );
}
