import type { Tone } from "@/lib/status";

const TONES: Record<Tone, string> = {
  neutral: "border-line text-muted",
  info: "border-accent text-accent bg-accent/5",
  warn: "border-warn text-warn bg-warn/10",
  danger: "border-danger text-danger bg-danger/10",
  ok: "border-ok text-ok bg-ok/10",
};

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
