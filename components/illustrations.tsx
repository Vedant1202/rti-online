/**
 * Small illustrations drawn for this project (no third-party art). Colours come from theme tokens
 * via Tailwind fill/stroke classes, so they follow light and dark mode. All are decorative.
 */
type ArtProps = { className?: string };

const svg = (className = "") => ({
  viewBox: "0 0 160 120",
  "aria-hidden": true as const,
  focusable: "false" as const,
  className,
});

export function WriteArt({ className }: ArtProps) {
  return (
    <svg {...svg(className)}>
      <circle cx="80" cy="62" r="48" className="fill-tile-indigo-bg" />
      <rect x="50" y="22" width="56" height="74" rx="8" className="fill-surface stroke-line" strokeWidth="2" />
      <rect x="60" y="36" width="36" height="5" rx="2.5" className="fill-accent" />
      <rect x="60" y="48" width="30" height="4" rx="2" className="fill-line" />
      <rect x="60" y="58" width="34" height="4" rx="2" className="fill-line" />
      <rect x="60" y="68" width="24" height="4" rx="2" className="fill-line" />
      <g transform="rotate(-35 114 80)">
        <rect x="94" y="75" width="40" height="10" rx="3" className="fill-tile-saffron-fg" />
        <path d="M134 75l9 5-9 5z" className="fill-ink" />
      </g>
      <path d="M36 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" className="fill-tile-saffron-fg" />
    </svg>
  );
}

export function PayArt({ className }: ArtProps) {
  return (
    <svg {...svg(className)}>
      <circle cx="80" cy="62" r="48" className="fill-tile-saffron-bg" />
      <rect x="36" y="38" width="76" height="48" rx="9" className="fill-accent" />
      <rect x="36" y="49" width="76" height="9" className="fill-bar" />
      <rect x="45" y="68" width="24" height="6" rx="3" className="fill-hero-muted" />
      <circle cx="110" cy="82" r="17" className="fill-tile-saffron-fg" />
      <circle cx="110" cy="82" r="10" fill="none" className="stroke-surface" strokeWidth="3" />
      <path d="M38 24l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" className="fill-accent" />
    </svg>
  );
}

export function ReplyArt({ className }: ArtProps) {
  return (
    <svg {...svg(className)}>
      <circle cx="80" cy="62" r="48" className="fill-tile-teal-bg" />
      <rect x="42" y="38" width="72" height="50" rx="8" className="fill-surface stroke-line" strokeWidth="2" />
      <path d="M45 43l33 24 33-24" fill="none" className="stroke-tile-teal-fg" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="112" cy="86" r="14" className="fill-ok" />
      <path d="M105 86l5 5 9-10" fill="none" className="stroke-surface" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppealArt({ className }: ArtProps) {
  return (
    <svg {...svg(className)}>
      <circle cx="80" cy="62" r="48" className="fill-tile-rose-bg" />
      <rect x="78" y="36" width="4" height="50" rx="2" className="fill-tile-rose-fg" />
      <rect x="58" y="86" width="44" height="6" rx="3" className="fill-tile-rose-fg" />
      <rect x="50" y="42" width="60" height="4" rx="2" className="fill-tile-rose-fg" />
      <path d="M54 46l-10 22h20z" className="fill-surface stroke-tile-rose-fg" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M106 46l-10 22h20z" className="fill-surface stroke-tile-rose-fg" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="80" cy="34" r="5" className="fill-tile-saffron-fg" />
    </svg>
  );
}

export function EmptyArt({ className }: ArtProps) {
  return (
    <svg {...svg(className)}>
      <circle cx="80" cy="62" r="48" className="fill-tile-indigo-bg" />
      <rect x="58" y="30" width="52" height="64" rx="8" className="fill-surface stroke-line" strokeWidth="2" transform="rotate(8 84 62)" />
      <rect x="48" y="28" width="52" height="64" rx="8" className="fill-surface stroke-line" strokeWidth="2" />
      <rect x="57" y="42" width="30" height="5" rx="2.5" className="fill-line" />
      <rect x="57" y="53" width="24" height="4" rx="2" className="fill-line" />
      <circle cx="98" cy="86" r="14" className="fill-accent" />
      <path d="M98 79v14M91 86h14" className="stroke-accent-ink" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function AllClearArt({ className }: ArtProps) {
  return (
    <svg {...svg(className)}>
      <circle cx="80" cy="62" r="48" className="fill-tile-teal-bg" />
      <circle cx="80" cy="62" r="26" className="fill-ok" />
      <path d="M68 62l8 8 16-17" fill="none" className="stroke-surface" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 28l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" className="fill-tile-saffron-fg" />
      <path d="M120 86l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" className="fill-accent" />
    </svg>
  );
}

/** For the sign-in brand panel, which sits on the hero gradient. */
export function SignInArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 240 180" aria-hidden="true" focusable="false" className={className}>
      <circle cx="120" cy="92" r="78" className="fill-hero-ink" opacity="0.08" />
      <rect x="82" y="22" width="76" height="140" rx="14" className="fill-hero-ink" opacity="0.95" />
      <rect x="92" y="40" width="56" height="8" rx="4" className="fill-accent" />
      <rect x="92" y="56" width="44" height="6" rx="3" className="fill-line" />
      <rect x="92" y="70" width="50" height="6" rx="3" className="fill-line" />
      <rect x="92" y="96" width="56" height="34" rx="8" className="fill-tile-indigo-bg" />
      <path d="M100 113l7 7 14-15" fill="none" className="stroke-accent" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="150" y="104" width="64" height="44" rx="8" className="fill-tile-saffron-bg" />
      <path d="M153 108l29 20 29-20" fill="none" className="stroke-tile-saffron-fg" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 56l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" className="fill-hero-ink" opacity="0.9" />
      <path d="M200 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" className="fill-hero-ink" opacity="0.7" />
    </svg>
  );
}
