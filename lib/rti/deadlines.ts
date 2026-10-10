export const DAY_MS = 24 * 60 * 60 * 1000;
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);
const daysBetween = (from: Date, to: Date) => (to.getTime() - from.getTime()) / DAY_MS;

export type FeePause = { from: Date; to: Date | null };

export type ReplyClock =
  | { state: "running"; dueAt: Date; daysLeft: number }
  | { state: "paused"; dueAt: null; daysLeftWhenPaused: number }
  | { state: "overdue"; dueAt: Date; daysOver: number }
  | { state: "met"; repliedAt: Date };

// s.7(1): 30 days, or 48 hours once a life-or-liberty claim is accepted.
// s.7(3): the time between a fee demand and its payment is excluded.
export function replyClock(
  req: {
    filedAt: Date;
    lifeOrLibertyAccepted: boolean;
    feePauses: FeePause[];
    repliedAt: Date | null;
  },
  now: Date,
): ReplyClock {
  if (req.repliedAt) return { state: "met", repliedAt: req.repliedAt };

  const limitDays = req.lifeOrLibertyAccepted ? 2 : 30;
  const pausedMs = req.feePauses.reduce(
    (sum, p) => sum + ((p.to ?? now).getTime() - p.from.getTime()),
    0,
  );
  const dueAt = new Date(addDays(req.filedAt, limitDays).getTime() + pausedMs);

  if (req.feePauses.some((p) => p.to === null)) {
    return { state: "paused", dueAt: null, daysLeftWhenPaused: Math.ceil(daysBetween(now, dueAt)) };
  }
  if (now > dueAt) return { state: "overdue", dueAt, daysOver: Math.floor(daysBetween(dueAt, now)) };
  return { state: "running", dueAt, daysLeft: Math.ceil(daysBetween(now, dueAt)) };
}

export type SimpleClock =
  | { state: "running"; dueAt: Date; daysLeft: number }
  | { state: "overdue"; dueAt: Date; daysOver: number }
  | { state: "met"; doneAt: Date };

// s.6(3): a transfer must happen within 5 days of receipt. We also use it as the nodal officer's routing target.
export function transferClock(receivedAt: Date, actedAt: Date | null, now: Date): SimpleClock {
  if (actedAt) return { state: "met", doneAt: actedAt };
  const dueAt = addDays(receivedAt, 5);
  if (now > dueAt) return { state: "overdue", dueAt, daysOver: Math.floor(daysBetween(dueAt, now)) };
  return { state: "running", dueAt, daysLeft: Math.ceil(daysBetween(now, dueAt)) };
}

export type AppealWindow =
  | { state: "not_yet"; opensAt: Date | null; closesAt: Date | null }
  | { state: "open"; opensAt: Date; closesAt: Date }
  | { state: "late"; opensAt: Date; closesAt: Date };

// s.19(1): appeal within 30 days of the decision, or of the date the decision was due.
// A late appeal is still possible if the appellant shows sufficient cause.
export function appealWindow(
  input: { repliedAt: Date | null; replyDueAt: Date | null; paused: boolean },
  now: Date,
): AppealWindow {
  const opensAt = input.repliedAt ?? (input.paused ? null : input.replyDueAt);
  if (!opensAt) return { state: "not_yet", opensAt: null, closesAt: null };
  const closesAt = addDays(opensAt, 30);
  if (now < opensAt) return { state: "not_yet", opensAt, closesAt };
  if (now > closesAt) return { state: "late", opensAt, closesAt };
  return { state: "open", opensAt, closesAt };
}

export type FaaClock =
  | { state: "running"; dueAt: Date; daysLeft: number; canExtend: boolean }
  | { state: "overdue"; dueAt: Date; daysOver: number; canExtend: false }
  | { state: "met"; decidedAt: Date; canExtend: false };

// s.19(6): decide within 30 days, or within an extended period of at most 45 days in total, with reasons recorded.
export function faaClock(
  appeal: { filedAt: Date; extended: boolean; decidedAt: Date | null },
  now: Date,
): FaaClock {
  if (appeal.decidedAt) return { state: "met", decidedAt: appeal.decidedAt, canExtend: false };
  const dueAt = addDays(appeal.filedAt, appeal.extended ? 45 : 30);
  if (now > dueAt) {
    return { state: "overdue", dueAt, daysOver: Math.floor(daysBetween(dueAt, now)), canExtend: false };
  }
  return {
    state: "running",
    dueAt,
    daysLeft: Math.ceil(daysBetween(now, dueAt)),
    canExtend: !appeal.extended,
  };
}

// s.19(3): second appeal to the Information Commission within 90 days.
export function secondAppealWindow(decidedOrDueAt: Date): Date {
  return addDays(decidedOrDueAt, 90);
}
