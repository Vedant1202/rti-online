# Implementation Plan: RTI Online Rebuild

Source: [SPEC.md](../SPEC.md) · Team of 4 · 6 weeks (weeks 5–6 have slack) · Status: **Draft, awaiting group sign-off**

## Overview

We build the portal one working path at a time. Week 1 sets up the shared foundation (project, database, legal-rule functions, login). Weeks 2–3 deliver the main path: file → pay → officer replies → citizen sees it. Week 4 adds fees, appeals and the FAA. Week 5 adds the should-have improvements. Week 6 is stretch goals and demo prep.

## Architecture decisions

- **One event log drives everything.** Every action appends a row to `request_events`. The timeline, statuses shown to users, and all deadlines are computed from it. This keeps the four people's code consistent.
- **Legal rules are pure functions in `lib/rti/`** with `now` passed in. They are written and tested in week 1, before any UI uses them.
- **Shared contract first.** Task 2 fixes the status enum, event types and Zod schemas. After that, people can work in parallel without breaking each other.
- **Route handlers for the backend** (`app/api/**/route.ts`), not Server Actions, so the backend is easy to point to in the presentation.
- **The mock payment gateway is a separate page with a signed webhook**, so it behaves like a real gateway (redirect out, callback in).

## Who owns what

| Person | Area | Main tasks |
|---|---|---|
| **A** | Platform: setup, login, payments, email | 1, 4, 6, 10 (payment part) |
| **B** | Citizen side: filing, timeline, appeal | 5, 7, 12, 14, 15, 16 |
| **C** | Officer side: nodal, CPIO, FAA | 8, 9, 10, 11, 13, 17 |
| **D** | Data and rules: schema, `lib/rti`, tests, cron, stats | 2, 3, 18, 19, 20 |

Pick A to be the person who owns the Vercel, Neon and Gmail accounts (spec open question 1).

## Dependency graph

```
T1 Scaffold + deploy ─────────────┐
T2 Schema + contract + seed ──────┼──► T4 OTP login ──► T5 File request ──► T6 Pay + reg no ──┬──► T7 Case timeline ──► T12 Appeal ──► T13 FAA
T3 lib/rti rules (no I/O) ────────┘                         │                                ├──► T8 Nodal ──► T9 CPIO reply ──┬──► T10 Extra fee
                                                            └──► T14 Suggest + state warning  │                                ├──► T11 Docs request
                                                                                               │                                └──► T17 Life/liberty
                                                                                               └──► T18 Cron · T19 Stats · T20 E2E (after T9/T13)
```

## Task list

### Phase 1: Foundation (week 1)

#### Task 1: Scaffold and first HTTPS deploy (A)
**Description:** Create the Next.js + TypeScript project with Tailwind, ESLint, Prettier, Vitest and Playwright set up. Create the GitHub repo (public) with `main` and `dev` branches. Deploy a landing page with the "Student project" footer to Vercel.
**Acceptance criteria:**
- [ ] All commands in the spec run (`dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`)
- [ ] `https://<project>.vercel.app` shows the landing page, and HTTP redirects to HTTPS
- [ ] Pushing a branch creates a preview URL
**Verification:** `npm run build && npm run lint && npm run typecheck && npm test`; open the URL over `http://` and confirm the redirect.
**Dependencies:** None
**Files:** `package.json`, `app/layout.tsx`, `app/page.tsx`, `vitest.config.ts`, `playwright.config.ts`
**Size:** M

#### Task 2: Schema, shared contract and seed data (D)
**Description:** Connect Drizzle to Neon. Create all tables from the spec's data model. Define the request status enum, event types and Zod input schemas in one shared file. Write the seed script (4 authorities, each with 1 nodal officer, 2 CPIOs and 1 FAA, using Gmail plus-addresses).
**Acceptance criteria:**
- [ ] `npm run db:migrate` creates every table on a fresh Neon branch
- [ ] `npm run db:seed` loads authorities and officers, and is safe to re-run
- [ ] `lib/contract.ts` exports statuses, event types and Zod schemas that everyone imports
**Verification:** Run migrate + seed twice; check the row counts in the Neon console.
**Dependencies:** T1
**Files:** `lib/db/schema.ts`, `lib/db/client.ts`, `lib/contract.ts`, `scripts/seed.ts`, `data/authorities.json`
**Size:** M

#### Task 3: Legal rules library (D, B can help)
**Description:** Pure functions with unit tests: `regno` (format, parse, split suffix), `deadlines` (reply clock, fee pause, 48-hour, transfer timer, appeal windows, FAA 30/45), `fees` (line items in paise), `wordcount` (Intl.Segmenter, Hindi-safe).
**Acceptance criteria:**
- [ ] Every timing in the spec's "Legal timings" table has at least one test
- [ ] Hindi text word count matches a hand count on 3 samples
- [ ] ≥ 90% line coverage on `lib/rti/`
**Verification:** `npm test -- --coverage tests/unit`
**Dependencies:** T1 (can run in parallel with T2)
**Files:** `lib/rti/regno.ts`, `lib/rti/deadlines.ts`, `lib/rti/fees.ts`, `lib/rti/wordcount.ts`, `tests/unit/*`
**Size:** M

#### Task 4: Email OTP login (A)
**Description:** Login page → send OTP by Gmail → verify → signed session cookie. Role helper for route handlers. `DEMO_SHOW_OTP` fallback.
**Acceptance criteria:**
- [ ] A real email arrives at a team inbox and the code signs you in
- [ ] Code expires after 10 minutes, can't be reused, and locks after 5 wrong tries; max 3 sends per 15 minutes
- [ ] Officer accounts land on their dashboard and citizens on theirs
**Verification:** Integration tests with PGlite and the Nodemailer JSON transport; one manual login on the preview URL.
**Dependencies:** T1, T2
**Files:** `lib/auth/otp.ts`, `lib/auth/session.ts`, `lib/auth/rbac.ts`, `lib/email/send.ts`, `app/login/page.tsx`, `app/api/auth/otp/*`
**Size:** M

### Checkpoint 1 (end of week 1)
- [ ] Every member can sign in on the preview URL
- [ ] Schema and contract are merged into `dev`; from now on, schema changes need group agreement
- [ ] All tests pass; build is clean
- [ ] Group reviews the plan before Phase 2

### Phase 2: Main path (weeks 2–3)

#### Task 5: Citizen files a request, up to payment (B)
**Description:** Filing wizard: authority search, Unicode text with live word count (warns past 500), optional PDF ≤ 1 MB to Vercel Blob, BPL declaration with certificate. Saves the request as `pending_payment`.
**Acceptance criteria:**
- [ ] A Hindi request of 600 words shows the warning and still saves
- [ ] Non-PDF or > 1 MB files are rejected with a clear message
- [ ] BPL without a certificate can't continue
**Verification:** Integration test for the create route; manual Hindi test at 375px.
**Dependencies:** T3, T4
**Files:** `app/requests/new/page.tsx`, `app/api/requests/route.ts`, `app/api/uploads/route.ts`, `components/word-count.tsx`
**Size:** M

#### Task 6: Mock payment and instant registration number (A)
**Description:** Checkout with an idempotency key → fake gateway page (Success / Fail / Close tab) → signed webhook → payment row, registration number and `filed` event in one transaction → "filed" email. BPL with certificate skips straight to filed.
**Acceptance criteria:**
- [ ] Firing the same webhook 5 times creates 1 payment and 1 registration number (spec criterion 2)
- [ ] A failed or abandoned payment leaves the request payable again, with no number
- [ ] Numbers follow `AUTHCODE/R/E/YY/NNNNN` and serials don't collide under parallel requests
**Verification:** Integration tests, including 5 parallel webhook calls; manual pay on the preview URL.
**Dependencies:** T5
**Files:** `app/pay/mock/[checkoutId]/page.tsx`, `app/api/payments/[id]/webhook/route.ts`, `app/api/payments/route.ts`, `lib/payments.ts`
**Size:** M

#### Task 7: Case timeline and "My requests" (B)
**Description:** Citizen's list of requests with status and days left, and a case page that renders all events, the reply clock, and grouped split parts.
**Acceptance criteria:**
- [ ] Shows due date, days left, and the paused / overdue / met states from `replyClock`
- [ ] A transferred request shows the new number on the same page
- [ ] Split parts appear grouped under the original, each with its own status
**Verification:** Component test with fixed events; manual check against seeded sample cases.
**Dependencies:** T6
**Files:** `app/requests/page.tsx`, `app/requests/[id]/page.tsx`, `components/timeline.tsx`, `app/api/requests/[id]/route.ts`
**Size:** M

#### Task 8: Nodal officer inbox: forward, split, transfer (C)
**Description:** Inbox of new requests with the 5-day transfer timer. Forward to one CPIO, or to several (creates `/1…/n` parts). Transfer to another authority (creates a new `T` number there). Emails the citizen on each action.
**Acceptance criteria:**
- [ ] Forwarding to 3 CPIOs creates 3 parts, each linked to the parent (spec criterion 6)
- [ ] A transfer creates `MHA…/R/T/26/…` at the receiving authority and closes the original with a link
- [ ] Only that authority's nodal officer can act (other roles get 403)
**Verification:** Integration tests for forward, split, transfer and RBAC.
**Dependencies:** T6
**Files:** `app/officer/nodal/page.tsx`, `app/api/requests/[id]/forward/route.ts`, `app/api/requests/[id]/transfer/route.ts`
**Size:** M

#### Task 9: CPIO reply and reject (C)
**Description:** CPIO workspace listing assigned requests by due date. Reply with text and an optional PDF, or reject with a written reason. Emails the citizen.
**Acceptance criteria:**
- [ ] Reply and rejection appear on the citizen's timeline and stop the clock
- [ ] A rejection can't be saved without a reason
- [ ] The citizen can download the reply PDF; other users can't
**Verification:** Integration tests; manual check end to end on the preview URL.
**Dependencies:** T8
**Files:** `app/officer/cpio/page.tsx`, `app/api/requests/[id]/reply/route.ts`, `app/api/requests/[id]/reject/route.ts`
**Size:** M

#### Task 14: Authority suggestion and state-body warning (B)
**Description:** Suggest up to 3 authorities from keywords in the text. Show the state-body warning before the payment step.
**Acceptance criteria:**
- [ ] "train ticket refund" suggests the Ministry of Railways
- [ ] Text naming a state body or municipality shows the warning before payment, and the citizen can continue (spec criterion 5)
**Verification:** Unit tests for both matchers; manual check in the wizard.
**Dependencies:** T5
**Files:** `lib/rti/suggest-authority.ts`, `lib/rti/state-body.ts`, `data/state-terms.json`, `app/requests/new/page.tsx`
**Size:** S

### Checkpoint 2 (end of week 3)
- [ ] File → pay → nodal forwards → CPIO replies → citizen sees it, on the preview URL
- [ ] All tests pass; `dev` merged to `main`; production URL works
- [ ] Group demo to each other; adjust Phase 3 scope if behind

### Phase 3: Fees, appeals and FAA (week 4)

#### Task 10: Itemised extra fee with a paused clock (C officer side, A payment side)
**Description:** CPIO adds fee line items. The citizen sees the breakdown and a paused clock, pays through the mock gateway, and the clock resumes.
**Acceptance criteria:**
- [ ] The total equals the sum of the line items, in paise
- [ ] The due date moves later by exactly the unpaid days (s.7(3))
- [ ] Payment is idempotent, as in T6
**Verification:** Unit test on the pause maths; integration test for demand → pay.
**Dependencies:** T6, T9
**Files:** `app/api/requests/[id]/fee/route.ts`, `components/fee-breakdown.tsx`, `app/officer/cpio/page.tsx`
**Size:** M

#### Task 11: CPIO asks for documents (C)
**Description:** CPIO requests a document; the citizen uploads it from the case page.
**Acceptance criteria:**
- [ ] The request shows "documents requested" and an upload button for the citizen only
- [ ] The upload appears on the CPIO's view and on the timeline
**Verification:** Integration test.
**Dependencies:** T9
**Files:** `app/api/requests/[id]/documents/route.ts`, `app/requests/[id]/page.tsx`
**Size:** S

#### Task 12: One-click first appeal (B)
**Description:** "File first appeal" button on the case page, available after a reply or after the deadline passes. The ground is preselected when the deadline passed. Creates an `A` number. Late appeals need a reason.
**Acceptance criteria:**
- [ ] The button is disabled before it's allowed, and shows the date it opens
- [ ] No details are re-entered; the appeal links to the right part when the request was split
- [ ] After 30 days the appeal still works but asks for a reason for the delay
**Verification:** Integration tests using `appealWindow` with moved time.
**Dependencies:** T7, T9
**Files:** `app/appeals/new/[requestId]/page.tsx`, `app/api/appeals/route.ts`, `app/appeals/[id]/page.tsx`
**Size:** M

#### Task 13: FAA queue: decide and extend (C)
**Description:** FAA sees appeals by due date, can extend once to 45 days with a reason, and decides with a written order.
**Acceptance criteria:**
- [ ] An extension without a reason is rejected, and an extension past 45 days is impossible
- [ ] The decision appears on the citizen's appeal timeline, with an email
**Verification:** Integration tests.
**Dependencies:** T12
**Files:** `app/officer/faa/page.tsx`, `app/api/appeals/[id]/decide/route.ts`, `app/api/appeals/[id]/extend/route.ts`
**Size:** M

#### Task 20: End-to-end golden paths (D)
**Description:** The spec's 3 Playwright journeys at desktop and 375px, with a test-only clock override that is disabled in production.
**Acceptance criteria:**
- [ ] All 3 paths pass locally and on the preview URL
- [ ] The clock override returns 404 in production
**Verification:** `E2E_BASE_URL=<preview> npm run test:e2e`
**Dependencies:** T10, T13
**Files:** `e2e/*.spec.ts`, `app/api/test/clock/route.ts`
**Size:** M

### Checkpoint 3 (end of week 4)
- [ ] All must-have (M) features in the spec are done
- [ ] All 3 golden paths pass on the production URL (spec criterion 1)
- [ ] Group decides which should-haves fit in week 5

### Phase 4: Should-haves (week 5)

#### Task 15: Autosave drafts (B)
**Acceptance:** [ ] Draft saves within 5 seconds of typing · [ ] Reopening on another browser restores it · [ ] Draft is deleted once filed
**Verify:** Integration test; manual check in 2 browsers. **Deps:** T5 · **Files:** `app/api/drafts/route.ts`, `app/requests/new/page.tsx` · **Size:** S

#### Task 16: Request templates (B)
**Acceptance:** [ ] 4–6 templates load into the editor · [ ] Placeholders (dates, file numbers) are highlighted until filled
**Verify:** Manual check. **Deps:** T5 · **Files:** `data/templates.json`, `components/template-picker.tsx` · **Size:** S

#### Task 17: Life-or-liberty claim (C)
**Acceptance:** [ ] Claim needs a justification · [ ] CPIO accept switches to the 48-hour clock; decline returns to 30 days with a reason · [ ] Both show on the timeline
**Verify:** Unit test (deadlines) + integration test. **Deps:** T9 · **Files:** `app/api/requests/[id]/life-liberty/route.ts`, wizard, CPIO page · **Size:** S

#### Task 18: Daily reminder cron (D)
**Acceptance:** [ ] `vercel.json` schedule is daily (Hobby rule) · [ ] Route rejects calls without `CRON_SECRET` · [ ] Sends due-in-3-days, newly-overdue, appeal-opens and appeal-closing emails, without duplicates on re-run
**Verify:** Integration test with moved time; `vercel crons run /api/cron/daily` on production. **Deps:** T12 · **Files:** `vercel.json`, `app/api/cron/daily/route.ts` · **Size:** S

#### Task 19: Public stats page (D)
**Acceptance:** [ ] Median reply days and % overdue per authority over 90 days · [ ] No names, emails or request text exposed · [ ] Works at 375px
**Verify:** Integration test on seeded data. **Deps:** T9 · **Files:** `app/stats/page.tsx`, `lib/stats.ts` · **Size:** M

### Checkpoint 4 (end of week 5)
- [ ] Spec success criteria 1–9 all pass
- [ ] Lighthouse accessibility ≥ 90 on the filing page
- [ ] Feature freeze: only bug fixes and stretch goals after this

### Phase 5: Stretch and demo (week 6)

- **Task 21: Second-appeal bundle PDF (C):** PDF with request, replies, appeal and order, plus a link to the CIC portal. Size M.
- **Task 22: Hindi interface labels (B):** stretch only. Size M.
- **Task 23: Demo prep (everyone):** realistic seed cases, today-vs-ours screenshots, a rehearsal with `DEMO_SHOW_OTP` ready as fallback, and test emails sent from the Gmail account a day before.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Teammates' commits blocked by Vercel Hobby | High | Public repo from day 1 (T1) |
| Gmail flags the new account or emails are slow during the demo | High | Warm up the account in week 1; `DEMO_SHOW_OTP` fallback |
| Schema changes break other people's work | High | Contract fixed in T2; later changes need group agreement |
| Deadline maths wrong (time zones, pauses) | Medium | Pure functions with tests in week 1 (T3); store UTC, show IST |
| Duplicate registration numbers under parallel payments | Medium | Atomic counter in the same transaction; parallel test in T6 |
| Free-tier limit hit (Blob uploads, cron) | Medium | 1 MB cap; daily cron only; no load tests on production |
| Falling behind | Medium | Must-haves finish in week 4; weeks 5–6 are cuttable |

## Open questions

- Spec open questions 1–6 still need group answers. This plan assumes the proposed answers.
- Is anyone on the team new to TypeScript or Next.js? If so, pair them with A in week 1.
