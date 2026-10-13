# Spec: RTI Online Rebuild

Status: **v1 built; v2 built (see "Version 2" below)**
Group 4 · Timeline: 4–6 weeks · Last updated: 8 Oct 2026

## Objective

Rebuild [rtionline.gov.in](https://rtionline.gov.in) (the central government portal for filing Right to Information requests and first appeals) as a working full-stack app, then improve on it. It should behave like the real portal: same roles, same legal deadlines, same registration-number format. It should also fix the problems we found in the portal's own FAQ and user manual.

**Users (roles)**

| Role | Who they are | What they do |
|---|---|---|
| Citizen | Anyone with an email address | File requests, pay, track, appeal |
| Nodal officer | One per public authority | Receive requests, forward to the right CPIO, or transfer to another authority |
| CPIO | Central Public Information Officer | Reply, ask for an extra fee or documents, reject with reasons |
| FAA | First Appellate Authority | Decide first appeals |
| Admin | Our team | Seed data, view everything |

**Success looks like:** a citizen can file a request in Hindi or English, pay, get a registration number at once, and follow it to a reply or an appeal on one timeline. Officers can see and meet every legal deadline. The whole thing runs on free tiers.

**Out of scope:** real payments, real SMS, Aadhaar, connecting to any real government system, state-government RTI, and second appeals (we only prepare a bundle and link to the CIC portal).

## Features and acceptance criteria

Priority: **M** = must have, **S** = should have (planned within 4–6 weeks), **C** = could have (stretch).

### Replicated from the real portal

| # | Feature | Priority | Acceptance criteria |
|---|---|---|---|
| R1 | Email OTP login | M | Citizen enters email, gets a 6-digit code by email, and is signed in. Officers sign in the same way with seeded emails. |
| R2 | File a request | M | Pick an authority, write the request, optionally attach one PDF ≤ 1 MB, declare BPL status (with certificate upload), submit. |
| R3 | Fee payment (mock) | M | ₹10 fee. BPL applicants with a certificate pay ₹0. Payment goes through our fake gateway page with Success / Fail / Close-tab outcomes. |
| R4 | Registration number | M | Format `AUTHCODE/R|A/E|P|T|X|L/YY/NNNNN`, e.g. `DOPAT/R/E/26/00412`. Serial increments per authority, type and year. Split parts append `/1`, `/2`… |
| R5 | Nodal officer routing | M | Nodal officer forwards to one or more CPIOs (multiple CPIOs = split) or transfers to another authority. A transfer creates a new number with receipt type `T`. |
| R6 | CPIO actions | M | Reply (text + PDF), request extra fee, request documents, reject with a written reason. |
| R7 | Extra fee | M | Citizen sees the demand and pays it through the same mock gateway. |
| R8 | First appeal | M | Allowed after a reply, or after the reply deadline passes with no reply. Ground chosen from the portal's five options. No fee. Number uses `A`. |
| R9 | FAA decision | M | FAA decides the appeal with a written order. |
| R10 | Email notifications | M | Emails for: filed, forwarded, transferred, fee requested, documents requested, replied, appeal filed, appeal decided. |

### Improvements

| # | Feature | Priority | Acceptance criteria |
|---|---|---|---|
| I1 | Any-language text | M | Request text accepts Hindi and other Unicode scripts. Live word count; a warning appears past 500 words (RTI Rules 2012, Rule 3) but never blocks. Hard technical cap: 20,000 characters. |
| I2 | Authority suggestion | M | Keeps search. Also suggests up to 3 authorities by matching keywords in the request text. No AI service. |
| I3 | State-body warning | M | If the text matches state-government terms, a warning shows **before payment** explaining that state bodies are returned without refund. The citizen can still continue. |
| I4 | Instant, safe payment | M | The registration number is assigned in the same database transaction as payment success. A repeated webhook or double-click creates exactly one payment and one number. |
| I5 | Reply clock | M | Every request shows its due date and days left. 30 days from filing (s.7(1)). Days between a fee demand and its payment don't count (s.7(3)). Overdue requests are flagged for the officer and the citizen. |
| I6 | One case timeline | M | One page per request shows every event: filing, forwarding, transfer (with the new number), split parts (grouped, each with its own status), fee, reply, appeal. |
| I7 | One-click appeal | M | A signed-in citizen appeals from the case page without re-entering details. The ground "No response within the time limit" is preselected when the deadline passed. |
| I8 | Itemised extra fee | M | The CPIO enters line items (e.g. 12 pages × ₹2, Rule 4). The citizen sees the breakdown and a "clock paused" state. |
| I9 | Transfer timer | M | The nodal officer sees a 5-day transfer deadline per request (s.6(3)). |
| I10 | FAA clock | M | The appeal is due in 30 days. FAA can extend to 45 days total only with a recorded reason (s.19(6)). |
| I11 | Expiring OTPs | M | 6 digits, stored hashed, single use, expire in 10 minutes, max 5 attempts, max 3 sends per 15 minutes per email. |
| I12 | Valid HTTPS | M | Served only over HTTPS on `*.vercel.app`. No help text ever tells users to bypass a browser warning. |
| I13 | Autosave drafts | S | Drafts save to the account every few seconds and resume on another device. |
| I14 | Request templates | S | 4–6 starter templates (pension status, answer-sheet copy, file notings, tender records) that prompt for dates, file numbers and exact records. |
| I15 | Life-or-liberty track | S | Citizen can claim it only with a written justification. CPIO accepts (48-hour clock) or declines (back to 30 days) with a recorded reason. |
| I16 | Daily reminders | S | Daily cron emails: replies due in 3 days, newly overdue, appeal window opening, appeal window closing in 5 days. |
| I17 | Public stats page | S | Per authority: median reply days and % overdue over the last 90 days. No personal data shown. |
| I18 | Second-appeal bundle | C | PDF with request, replies, appeal and FAA order, plus a link to the CIC online appeal portal. Appeal window shown as 90 days (s.19(3)). |
| I19 | Hindi interface labels | C | UI text available in Hindi. |

## Tech stack

All free tier. No credit card on any service.

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js (latest stable, App Router) + TypeScript | Pages plus API route handlers in one project |
| Hosting | Vercel Hobby | Free for non-commercial use; automatic HTTPS |
| Database | Neon Postgres (free plan) | 1 GB; sleeps after 5 min idle |
| ORM / migrations | Drizzle ORM + drizzle-kit, `@neondatabase/serverless` driver | |
| File storage | Vercel Blob (private store) | 1 GB, 2,000 uploads/month on Hobby |
| Email | Nodemailer + a team Gmail account with an App Password | ~500 recipients/day |
| Sessions | Signed HTTP-only cookie (`jose`) | 7-day expiry |
| Validation | Zod, shared by client and server | |
| Styling | Tailwind CSS | |
| PDF | `pdf-lib` | Only for I18 |
| Scheduled jobs | Vercel Cron, once per day | Hobby limit: daily, ±59 min |
| Tests | Vitest, PGlite (in-memory Postgres), Playwright | |

## Commands

```bash
npm install                 # install dependencies
npm run dev                 # local dev server at http://localhost:3000
npm run build               # production build
npm run lint                # ESLint (next config)
npm run typecheck           # tsc --noEmit
npm test                    # Vitest unit + integration tests, single run
npm test -- --coverage      # with coverage report
npm run test:e2e            # Playwright against E2E_BASE_URL (default localhost)
npm run db:generate         # drizzle-kit generate (create migration from schema)
npm run db:migrate          # drizzle-kit migrate (apply migrations to DATABASE_URL)
npm run db:seed             # tsx scripts/seed.ts (authorities, officers, sample requests)
```

Deploy: push a branch to get a Vercel preview URL. Merging `dev` → `main` deploys production.

**Environment variables** (in `.env.local` locally and in Vercel settings, never committed):

```
DATABASE_URL=            # Neon connection string
BLOB_READ_WRITE_TOKEN=   # Vercel Blob
SESSION_SECRET=          # 32+ random bytes
OTP_PEPPER=              # random string for hashing OTPs
GMAIL_USER=              # team demo Gmail address
GMAIL_APP_PASSWORD=      # 16-character App Password
MOCK_PAYMENT_SECRET=     # signs mock gateway webhooks
CRON_SECRET=             # Vercel sends this to /api/cron/daily
DEMO_SHOW_OTP=false      # true = also show OTP on screen (live-demo fallback)
```

## Project structure

```
rti-online/
  app/
    page.tsx                    → landing: file / track / appeal
    login/                      → email OTP sign-in
    requests/new/               → filing wizard (template → text → pay)
    requests/[id]/              → case timeline, appeal button
    appeals/[id]/               → appeal timeline
    officer/nodal/              → nodal inbox
    officer/cpio/               → CPIO workspace
    officer/faa/                → FAA queue
    stats/                      → public reply-time stats
    pay/mock/[checkoutId]/      → fake payment gateway page
    api/
      auth/otp/send/route.ts
      auth/otp/verify/route.ts
      requests/route.ts         → create, list
      requests/[id]/…           → forward, transfer, reply, fee, documents, reject
      appeals/…                 → file, decide, extend
      payments/[id]/webhook/route.ts
      uploads/route.ts          → Blob upload + authorised download
      cron/daily/route.ts
  lib/
    rti/                        → pure legal logic, no I/O
      deadlines.ts              → reply clock, transfer timer, appeal windows, FAA clock
      regno.ts                  → registration number format and parsing
      fees.ts                   → fee and line-item totals (paise)
      wordcount.ts              → Intl.Segmenter-based word count
      suggest-authority.ts
      state-body.ts
    db/schema.ts, db/client.ts
    auth/session.ts, otp.ts, rbac.ts
    email/send.ts, email/templates/
    pdf/bundle.ts
  components/                   → shared UI components
  data/                         → authorities.json, templates.json, state-terms.json
  drizzle/                      → generated migrations
  scripts/seed.ts
  tests/unit/                   → lib/rti tests
  tests/integration/            → route handlers against PGlite
  e2e/                          → Playwright golden paths
  vercel.json                   → cron schedule
  SPEC.md
```

### Data model (summary)

- `users`: email, name, role (`citizen | nodal | cpio | faa | admin`), authority_id for officers
- `authorities`: code, name, ministry, is_central, keywords
- `requests`: reg_no (unique), kind (`R | A`), receipt (`E | P | T | X | L`), parent_id (split parent or original request for an appeal), transferred_from_id, citizen_id, authority_id, assigned_cpio_id, text, bpl, life_liberty (claimed / accepted / declined + reasons), status, filed_at
- `request_events`: append-only timeline. type, actor_id, at, payload (jsonb). **The timeline and all deadlines are derived from these events.**
- `payments`: request_id, purpose (`fee | additional`), amount_paise, idempotency_key (unique), status
- `fee_demands`: request_id, items (jsonb), total_paise, sent_at, paid_at
- `documents`: request_id, blob_path, kind, uploaded_by
- `drafts`: citizen_id, payload, updated_at
- `otps`: email, code_hash, expires_at, used_at, attempts
- `reg_counters`: authority_code, kind, receipt, year, last_serial (incremented atomically)

### Legal timings encoded

| Rule | Source | Encoded as |
|---|---|---|
| Reply within 30 days | RTI Act s.7(1) | `filed_at + 30 days + paused days` |
| 48 hours for life or liberty | s.7(1) proviso | only once the CPIO accepts the claim |
| Fee period excluded | s.7(3) | pause from fee demand sent until paid |
| Transfer within 5 days | s.6(3) | from receipt by the nodal officer |
| First appeal within 30 days | s.19(1) | from reply, or from the missed deadline; late appeal allowed with a reason |
| FAA decides in 30, max 45 days | s.19(6) | extension needs a recorded reason |
| Second appeal within 90 days | s.19(3) | shown only; filing happens on the CIC portal |

Days are calendar days in IST (see Open Questions).

## Code style

- TypeScript `strict`. No `any`.
- Prettier defaults. ESLint `next/core-web-vitals`.
- Files are kebab-case; React components are PascalCase.
- Money is integer paise. Dates are stored UTC (`timestamptz`) and shown in IST.
- Legal rules live only in `lib/rti/`, as pure functions that take `now` as a parameter, so tests can move time.
- Cite the section in a short comment where a rule comes from the Act.
- Every route handler: parse input with Zod → check role → do the work → return JSON.

```ts
// lib/rti/deadlines.ts
const DAY_MS = 24 * 60 * 60 * 1000;

export type FeePause = { from: Date; to: Date | null };

export type ReplyClock =
  | { state: "running"; dueAt: Date; daysLeft: number }
  | { state: "paused"; dueAt: null; daysLeftWhenPaused: number }
  | { state: "overdue"; dueAt: Date; daysOver: number }
  | { state: "met"; repliedAt: Date };

// s.7(1): 30 days, or 48 hours once a life-or-liberty claim is accepted.
// s.7(3): time between a fee demand and its payment is excluded.
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

  const limitMs = req.lifeOrLibertyAccepted ? 2 * DAY_MS : 30 * DAY_MS;
  const pausedMs = req.feePauses.reduce(
    (sum, p) => sum + ((p.to ?? now).getTime() - p.from.getTime()),
    0,
  );
  const dueAt = new Date(req.filedAt.getTime() + limitMs + pausedMs);
  const openPause = req.feePauses.find((p) => p.to === null);

  if (openPause) {
    const leftMs = dueAt.getTime() - now.getTime();
    return { state: "paused", dueAt: null, daysLeftWhenPaused: Math.ceil(leftMs / DAY_MS) };
  }
  if (now > dueAt) {
    return { state: "overdue", dueAt, daysOver: Math.floor((now.getTime() - dueAt.getTime()) / DAY_MS) };
  }
  return { state: "running", dueAt, daysLeft: Math.ceil((dueAt.getTime() - now.getTime()) / DAY_MS) };
}
```

## Testing strategy

| Level | Tool | What it covers | Target |
|---|---|---|---|
| Unit | Vitest | Everything in `lib/rti/`: deadlines, reg numbers, fees, word count, authority suggestion, state-body detection | ≥ 90% line coverage of `lib/rti/` |
| Integration | Vitest + PGlite | Route handlers: payment idempotency, RBAC on every officer action, transfer creates `T` number, split creates `/1…/n`, OTP expiry and attempt limits | Every M feature has at least one test |
| End to end | Playwright | 3 golden paths (below), on desktop and 375px width | All pass on the preview URL before merging to `main` |
| Manual | Checklist | Hindi input and display, emails arrive in Gmail, Lighthouse accessibility ≥ 90 on the filing page | Before the demo |

Golden paths:
1. Citizen signs in → files in Hindi → sees state warning (dismisses) → pays → gets a number → sees the timeline.
2. Nodal officer forwards to 2 CPIOs → one replies, one requests a fee → citizen pays → paused clock resumes → reply arrives.
3. Deadline passes with no reply (test clock moved forward) → citizen appeals in one click → FAA extends with a reason → decides.

Test rules:
- Emails use Nodemailer's JSON transport in tests. No real sends.
- Time is injected (`now` parameter; a test-only clock override for e2e that is disabled in production).
- Tests never touch the Neon production database.

## Boundaries

**Always**
- Validate every input on the server with Zod, and check the user's role in every route handler.
- Keep secrets in environment variables. `.env*` stays in `.gitignore`.
- Use fake seed data only: fake names, fake BPL numbers, team emails (Gmail plus-addresses like `name+cpio@gmail.com`).
- Run `npm run lint && npm run typecheck && npm test` before pushing.
- Branch from `dev` and open pull requests into `dev`. `main` only receives `dev` → `main` merges.
- Show a footer on every page: "Student project. Not affiliated with DoPT or the Government of India."

**Ask the group first**
- Database schema changes after week 1.
- Adding a dependency not listed in the tech stack.
- Anything that could exceed a free tier (more frequent cron, a new hosted service).
- Changing the registration-number format or any legal timing.
- Making the GitHub repo private (Vercel Hobby blocks deployments from other people's commits on private repos).

**Never**
- Commit secrets, including the Gmail App Password.
- Use real personal data: Aadhaar, real BPL cards, real requests.
- Connect a real payment gateway or move real money.
- Use the Emblem of India, the "Government of India" or "DoPT" names as branding, or anything that makes the site look official.
- Email anyone outside the team.
- Delete or skip a failing test without group agreement.
- Push directly to `main`.

## Success criteria

1. All three golden paths pass on the production `*.vercel.app` URL.
2. Firing the same payment webhook 5 times creates exactly 1 payment and 1 registration number.
3. Deadline unit tests cover 30-day, accepted 48-hour, declined 48-hour, fee pause, 5-day transfer, appeal window open/close, late appeal, and FAA 30/45 days, and all pass.
4. A 600-word Hindi request shows the warning, submits, and displays correctly on the case page and in the email.
5. A request mentioning a state body shows the warning before the payment step.
6. A request split across 3 CPIOs appears as one case with 3 parts, each appealable on its own.
7. An OTP is rejected after 10 minutes, on reuse, and after 5 wrong attempts.
8. Every page works at 375px width with no horizontal scrolling.
9. Nothing on any service needs a paid plan or a credit card.

## Open questions (proposed answers in brackets)

1. **Who owns the Vercel, Neon and Gmail accounts?** [One member owns all three. The repo is public so everyone's commits deploy.]
2. **Calendar days or working days for deadlines?** [Calendar days in IST. The Act counts days. The "24–48 working hours" figure on the real portal is about payment reconciliation, which we're removing.]
3. **Which authorities do we seed?** [DoPT, Dept. of Pension & Pensioners' Welfare, Ministry of Railways, and Ministry of Home Affairs (as the transfer target). 1 nodal officer, 2 CPIOs and 1 FAA each.]
4. **Can a CPIO close a request when an extra fee stays unpaid?** [Yes, after 30 days unpaid, with an email to the citizen. This is our rule, not the Act's.]
5. **Should the look copy the real portal?** [No. We copy the flows, data and rules, and show today vs. ours in the presentation.]
6. **Hindi interface labels (I19)?** [Stretch only. Request content can already be in Hindi.]

## Changes made during the build

- **Word count:** counts whitespace-separated tokens containing a letter or digit, in any script, instead of `Intl.Segmenter`. It's predictable for Hindi and for file numbers like `PPO/2019/4471`.
- **Filing order:** the wizard asks for the request first, then the authority, so suggestions (I2) and the state-body warning (I3) can use the text.
- **Second-appeal bundle (I18):** a print-ready HTML file instead of a PDF, because `pdf-lib`'s built-in fonts can't render Hindi. Browsers save it as PDF. `pdf-lib` was removed.
- **Session cookie:** marked `Secure` whenever the request is HTTPS (always on Vercel) rather than by `NODE_ENV`, so local production builds work over `http://localhost`.
- **Local and e2e database:** PGlite on disk for development (auto-migrates and seeds itself), in memory for end-to-end tests. The connection is shared through `globalThis` because Next.js bundles route handlers and pages separately.
- **Hindi interface labels (I19):** not built. It was a stretch goal.

## Version 2 (October 2026)

Plan: [tasks/plan-v2.md](tasks/plan-v2.md). Workflow for this project: commit and push directly to `main`.

- **Card checkout:** replaces the mock gateway page. Brand detection, Luhn, length, expiry and CVC checks run in the browser; two saved cards (Visa 4242…, Mastercard 4444…) fill the form; `4000 0000 0000 0002` is declined. The server accepts only `{brand, last4}` (strict schema) and stores them on the payment for the receipt. Nothing is charged. No Stripe name or logo; the site-wide student-project footer stays.
- **Gemini AI:** server-only `@google/genai` (`GEMINI_API_KEY`, `GEMINI_MODEL`, default `gemini-flash-latest`), low thinking, 40 s timeout, 20 calls per user per hour (`ai_usage` table). "Rewrite formally" keeps the request's language and every number and `[placeholder]` (checked in code, one retry), as a preview with Undo. "Recommended" department picks only from seeded authority IDs, with keyword suggestions as the fallback.
- **UI:** lucide icons, instant `loading.tsx` skeletons and a top progress bar (the root layout no longer reads cookies; theme is applied by a pre-paint script), busy states on buttons, info buttons and a `/help` page.
- **Accessibility:** skip link, polite live region for action results, visible focus in both themes, reduced motion, axe-core scans with zero serious or critical issues in light and dark, keyboard-only filing path, Lighthouse accessibility 100 on the landing, filing and case pages.
- **Schema:** `payments.card_brand`, `payments.card_last4` (migration 0001), `ai_usage` (migration 0002).

## Version 3: Redesign (October 2026)

Plan: [tasks/plan.md](tasks/plan.md). Status: **Draft, awaiting sign-off.** Workflow: commit and push directly to `main`.

### Objective

The course asks for a visual and UX redesign, not only a rebuild. v3 gives the app a government-standard look and cuts clicks on the citizen's most common jobs. It follows [UX4G 3.0](https://ux4g.gov.in/), the Government of India's design system from NeGD/MeitY. Users are citizens on phones first, then officers on desktops.

What the audit of rtionline.gov.in found (October 2026):
- **Phones:** no viewport tag, so a 375px phone shows the 980px desktop page shrunk down.
- **Visual style:** gradient header, scrolling red text, blinking "new" GIFs, Calibri, unstyled buttons.
- **Menu:** 11 equal items and no main action on the home page.
- **Repeated checks:**
  - View Status, View History and Payment Reconciliation each ask for email, a CAPTCHA and an OTP separately.
  - A citizen login is also required.
- **Rules page:** a 21-rule page with an "I have read" checkbox before every request and appeal.
- **Authority list:** 2,925 public authorities with no search. That page also drops the site header.

### Assumptions

1. The redesign ships in the live app. It's built for real, not a mockup.
2. No new runtime dependencies and no database schema changes. Fonts come through `next/font`. Text size and language are cookies, like the theme.
3. Legal rules, deadlines, registration numbers and the payment flow don't change.
4. Officer pages get the new look automatically through the shared tokens. Their layout stays desktop-first and English-only.
5. The current tests stay. Where labels or steps change, the tests are updated in the same commit, never deleted.

### Decisions (open questions, answered by default)

1. **Official branding?** No. The existing Never rule stands: no Emblem of India, and no "Government of India" or "DoPT" branding.
   - We borrow UX4G's style (colours, type, spacing, controls), not its identity.
   - UX4G's top "Government of India" strip becomes a utility bar reading "Student rebuild · not an official website", with the text-size and language controls.
2. **Palette:** UX4G 3.0 tokens, adapted for dark mode. Every text pair must pass WCAG AA (4.5:1). Form-field borders must reach 3:1.
   - Light: paper `#fafafa`, surface `#ffffff`, ink `#171717`, muted `#525252`, line `#e5e5e5`.
   - Light: field border `#8a8a8a`, accent (primary-600) `#4a2bc2` with white text, saffron `#a46800`, ok `#006600`, warn `#ad4e00`, danger `#b3251e`.
   - Dark: paper `#0f0e17`, surface `#1a1825`, ink `#f5f5f5`, muted `#a3a3a3`, line `#2e2b3d`, field border `#6f6a85`.
   - Dark: accent (primary-300) `#a391ff` with text `#1a0e3d`, ok `#66cc66`, warn `#ffc973`, danger `#ffb3ae`.
   - Utility bar: indigo `#1a0e3d` with a 3px tricolour strip (`#ff9933` / `#ffffff` / `#138808`) under it.
3. **Type:** Noto Sans plus Noto Sans Devanagari (UX4G's base), replacing Atkinson Hyperlegible.
   - Corners: 8px on cards, 6px on buttons.
   - Buttons: 600 weight, at least 44px tall on phones.
4. **UX4G's CSS library?** Not used. It would add a second CSS framework on top of Tailwind. We recreate its tokens in `globals.css` instead.
5. **Phone navigation:**
   - Below 768px, citizens and signed-out visitors get a bottom tab bar: Home, File, My requests, Help.
   - The header shrinks to one row: logo plus Sign in or the account button.
   - The bar is hidden on checkout (`/pay/*`) and for officers.
   - It respects the safe-area inset, and pages get enough bottom padding that nothing hides behind it.
6. **Home page:**
   - **Signed-out:** a UX4G-style hero with two buttons (File a request, Track my requests), and "How it works" in 4 icon steps (Write → Pay ₹10 → Reply in 30 days → Appeal if needed). This replaces the real site's flowchart image.
   - **Signed-in citizens:**
     - A "Needs your action" list built by one pure function, `nextAction()`: pay the fee, pay an additional fee, upload a requested document, or read a reply and appeal by a date.
     - Under it, an "In progress" list with status and days left, and the File button.
     - "Read the reply" shows while the appeal window is open. We don't track whether a reply was read, because that would need a schema change.
   - **Officers:** see the public home with a banner linking to their queue.
7. **Filing in 2 steps:**
   - **Step 1, Write:** templates, subject, text, rewrite and attachment, with the authority picker under the text.
   - **Step 2, Review and pay:** summary, the below-poverty-line and life-or-liberty options, and one button, "Pay ₹10 and file". It creates the request, starts the checkout and opens the card page directly.
   - The `/requests/[id]/pay` page stays for additional fees and for resuming a payment later.
   - The AI recommendation runs 1.5 s after typing stops, once the text has at least 8 words, and once per distinct text. That keeps it inside the 20-per-hour limit.
8. **Case page:**
   - A stepper: Filed → With officer → Reply → Appeal → Decided. Waiting states such as an additional fee or a requested document are marked "Waiting for you" on the officer step. A rejection shows on the Reply step in red.
   - A bar showing days left on the reply clock.
   - A sticky next-action bar for the owner: at the bottom on phones, above the tab bar; at the top of the page on desktop.
   - The stage mapping is a pure function, `stageFor()`.
9. **Authority picker:**
   - Seed about 24 central authorities across 12 or more ministries, each with 4 officer accounts. The upsert is idempotent and runs on Neon after deploy.
   - Six "Popular" chips select in one click: Railways, EPFO, Passport (MEA), Income Tax (CBDT), UIDAI, India Post.
   - "Browse all" opens a list grouped by ministry. Search matches name, ministry and keywords, including Hindi keywords.
10. **Text size:**
    - A− / A / A+ sets the root font size to 87.5% / 100% / 125%.
    - Stored in the `rti_text` cookie and applied before first paint by the same inline script as the theme.
    - Browser zoom still works up to 200%.
11. **English/हिन्दी:**
    - A static typed dictionary in `lib/i18n/` (`en.ts` is the source; `hi.ts` must have the same type, so a missing key fails `tsc`). No runtime machine translation.
    - Stored in the `rti_lang` cookie. Pages read it; the root layout never does, so loaders stay instant. `<html lang>` is set before paint by the inline script.
    - In scope: utility bar, header, tab bar, footer, home, login, filing, My requests, case page, timeline, statuses, checkout, Help page and help tips.
    - Out of scope: officer pages, emails and API error messages stay English.
    - A Hindi-speaking teammate reviews the strings before the demo.
12. **Before/after evidence:**
    - `docs/redesign/` holds paired screenshots (real site vs ours) at desktop and 375px, plus a click-count table. These feed the report.
    - Only public pages of the real site are captured. No forms are submitted and no agreements ticked. The real portal's filing form is shown through its guidelines page.

### Click counts (citizen, typing not counted)

| Job | rtionline.gov.in | Ours today | v3 target |
|---|---|---|---|
| File and pay (saved card) | menu → tick rules → Submit → long form → Submit → Make payment → gateway | 8 | 6 |
| Check status | menu → reg no + email + CAPTCHA → OTP (every visit) | 2 | 0 (on home) |
| Pay an additional fee | separate login, then find the request | 6 | 4 |
| File a first appeal | menu → tick rules → reg no + email + CAPTCHA → OTP → form | 3 + form | 1 + form |

### Project structure (new)

```
lib/next-action.ts         → nextAction(caseSummary, now): what the citizen should do next (pure)
lib/progress.ts            → stageFor(status, …): stepper stage and tone (pure)
lib/prefs.ts               → text-size and language cookies (theme stays in lib/theme.ts)
lib/i18n/                  → en.ts (source), hi.ts, server.ts (getDict from cookie), client.tsx (LangProvider, useT)
components/utility-bar.tsx → unofficial notice, text size, language, theme
components/bottom-nav.tsx  → phone tab bar
components/case-stepper.tsx, next-action-bar.tsx, action-list.tsx, authority-picker.tsx
data/authorities.json      → about 24 authorities (was 4)
docs/redesign/             → before/after screenshots and click counts
```

### Success criteria

1. The tokens above are in place. axe-core reports zero serious or critical issues in light and dark. Lighthouse accessibility is at least 95 on home, filing and case pages, at 100% and 125% text size.
2. No emblem and no "Government of India" or "DoPT" branding anywhere. The utility bar and footer both say the site is unofficial.
3. At 375px:
   - The header is one row of 64px or less.
   - The tab bar shows 4 items at least 44px tall, with `aria-current` on the active one.
   - No page scrolls sideways, and the last element on each page stays visible above the bar.
   - The bar is absent at 768px and wider, and on `/pay/*`.
4. A citizen with an additional fee waiting sees "Pay ₹X" on `/` and reaches the card form in 2 clicks. A citizen with nothing pending sees "Nothing needs your attention" plus their in-progress requests.
5. Filing has 2 steps. A Playwright test files and pays from `/` in exactly 6 clicks with a saved card.
6. `stageFor()` is unit-tested for all 12 statuses. `nextAction()` is tested for every action type and for the appeal-window edges. The case page shows the stepper, days left and the sticky action.
7. At least 20 authorities across at least 10 ministries are seeded, locally and on Neon. A Popular chip selects in one click. Browse groups by ministry. Searching "पेंशन" finds the pension department.
8. Text size and language survive a reload with no flash. 125% at 375px has no sideways scroll.
9. With हिन्दी selected, every in-scope page shows Hindi interface text and `<html lang="hi">`. A missing Hindi key fails `npm run typecheck`. Golden path 1 passes with the Hindi interface.
10. `npm run lint && npm run typecheck && npm test && npm run test:e2e` all pass. No new runtime dependency and no schema change.
11. `docs/redesign/` has before/after pairs for home, filing, status/case, appeal and phone, plus the click table.

### Boundaries (v3 additions)

- **Always:**
  - Colours come only from tokens in `globals.css`.
  - From T3 on, new or changed citizen-facing text goes through `lib/i18n`. After T14, all of it does.
  - Keep the student-project notice on every page.
- **Ask first:** a new dependency, a schema change, removing a route, or changing any legal timing.
- **Never:**
  - Copy UX4G's logo or use the national emblem.
  - Translate interface text at runtime with Gemini.
  - Capture the real portal past its agreement checkboxes.
