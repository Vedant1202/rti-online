import { AlertTriangle, CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import type { Tone } from "@/lib/status";

const TONES: Record<Tone, string> = {
  neutral: "border-line text-muted",
  info: "border-accent text-accent bg-accent/5",
  warn: "border-warn text-warn bg-warn/10",
  danger: "border-danger text-danger bg-danger/10",
  ok: "border-ok text-ok bg-ok/10",
};

// Each tone has its own icon, so status isn't shown by colour alone.
const ICONS = { neutral: Circle, info: Clock, warn: AlertTriangle, danger: XCircle, ok: CheckCircle2 } as const;

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const Icon = ICONS[tone];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      <Icon size={12} aria-hidden="true" />
      {children}
    </span>
  );
}
