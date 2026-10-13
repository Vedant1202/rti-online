# Implementation Plan: RTI Online v2

Builds on [SPEC.md](../SPEC.md) and the finished v1 ([plan-v1.md](plan-v1.md)). Status: **Draft, awaiting sign-off**. Workflow: commit and push straight to `main`.

## Overview

Four additions to the live app:

1. **Card checkout:** a polished card payment page that detects the card brand, validates the number, expiry and CVC, offers two saved cards for quick filling, and never charges anything.
2. **Icons and loaders:** icons across all pages, a progress bar and skeletons between page switches, and spinners on buttons.
3. **Gemini AI:** "Rewrite formally" for the request text, and a "Recommended" department tag based on what the citizen wrote. Both show loaders while Gemini works.
4. **Help and accessibility:** info buttons that explain RTI terms, a Help page, and a full screen-reader and keyboard pass.

## Architecture decisions

- **Card details never leave the browser.** Validation runs in the page. The server receives only the brand and last 4 digits, never the full number or CVC, and nothing is stored beyond that. This keeps the checkout safe on a public site, where someone could type a real card.
- **Stripe-like layout, but not Stripe.** Order summary on the left, card form on the right, clean inputs, and the card brand icon appearing as you type. No Stripe name, logo or wording. The site-wide footer ("Student project… Do not enter real personal information") stays.
- **The checkout reuses the existing signed-webhook flow.** A valid card "succeeds", the app records the payment and the request is filed exactly as today. Idempotency and the registration-number logic don't change.
- **Gemini runs only on the server,** through route handlers using `@google/genai`. The key is in `GEMINI_API_KEY` (env only, never in the browser or the repo). The model comes from `GEMINI_MODEL`, default `gemini-flash-latest`. JSON responses are constrained with `responseJsonSchema`.
- **AI never overwrites silently.** The rewrite shows a preview with Use rewrite / Keep mine. The department tag is a suggestion; the citizen still picks.
- **AI degrades gracefully.** No key, a timeout (15 s), or the free-tier limit means the buttons explain that the feature is unavailable, and the keyword suggestions keep working.
- **Per-user AI limit:** 20 calls an hour, so one user can't use up the free quota.
- **Icons:** `lucide-react` (tree-shaken, one consistent outline style). Card-brand marks are small inline SVGs.
- **Accessibility is tested automatically:** axe-core checks in Playwright on key pages in both themes, plus keyboard-only e2e paths.

## Dependency graph

```
T1 Icons + a11y primitives (InfoTip, skip link, live region) ─┬─► T2 Page loaders + button spinners
                                                               ├─► T9 Icons across pages
                                                               └─► T10 Help buttons + Help page ─► T11 Accessibility pass
T3 Card rules (pure) ─► T4 Checkout page ─► T5 Payment receipt
T6 Gemini client + limits ─┬─► T7 Formal rewrite
                           └─► T8 Recommended department tag
```

## Task list

### Phase 1: Foundations

#### Task 1: Icons and accessibility building blocks
**Description:** Add `lucide-react`. Create an `InfoTip` component (button with `aria-expanded`; the popover closes on Escape or click outside; focus returns to the button), a "Skip to content" link, a polite `aria-live` announcer that client actions can call, and visible focus styles in both themes.
**Acceptance criteria:**
- [ ] `InfoTip` works by mouse, keyboard (Enter/Space/Escape) and screen reader (announced name and expanded state)
- [ ] Tab from the address bar reaches "Skip to content" first, and it jumps to `<main>`
- [ ] Focus rings are visible on every interactive element in light and dark
**Verification:** Component unit test for InfoTip state; Playwright keyboard test; `npm run build`.
**Dependencies:** None
**Files:** `components/info-tip.tsx`, `components/announcer.tsx`, `app/layout.tsx`, `app/globals.css`, `package.json`
**Size:** M

#### Task 2: Loaders between pages and on actions
**Description:** A thin top progress bar while a link navigation is pending, `loading.tsx` skeletons for My requests, the case page, the officer queues and the stats page, and spinners plus `aria-busy` on every button that calls the server.
**Acceptance criteria:**
- [ ] Clicking a link shows the progress bar within 100 ms and skeletons for slow pages
- [ ] Buttons show a spinner and are disabled while working; screen readers hear "Loading…"
- [ ] Respects `prefers-reduced-motion` (no animation; static indicator)
**Verification:** Playwright test with a throttled network asserting the skeleton appears; manual check with reduced motion on.
**Dependencies:** T1
**Files:** `components/nav-progress.tsx`, `app/**/loading.tsx` (4–5 files), `components/use-action.tsx`, `components/spinner.tsx`
**Size:** M

### Checkpoint 1
- [ ] All tests pass; build clean; deployed to production and checked

### Phase 2: Card checkout

#### Task 3: Card rules library
**Description:** Pure functions with tests: brand detection by number prefix (Visa, Mastercard, RuPay, American Express), Luhn check, valid lengths per brand, number formatting (4-4-4-4, or 4-6-5 for Amex), expiry (MM/YY, not past, within 20 years), and CVC length (3, or 4 for Amex).
**Acceptance criteria:**
- [ ] Every brand is detected from its first digits and shows as soon as it's identifiable
- [ ] Wrong checksum, wrong length, past expiry and short CVC each give a specific message
- [ ] 100% line coverage of `lib/card.ts`
**Verification:** `npm test -- tests/unit/card.test.ts --coverage`
**Dependencies:** None
**Files:** `lib/card.ts`, `tests/unit/card.test.ts`
**Size:** S

#### Task 4: Checkout page
**Description:** Replace the current gateway page with a card checkout: order summary (department, subject, amount), card number field with a live brand icon, expiry, CVC, name on card, two saved cards that fill the form in one click, inline errors, and a Pay button with a spinner. On submit the browser validates, then sends only `{brand, last4}`; the server completes the payment through the existing signed flow. One declining number shows the failure path.
**Acceptance criteria:**
- [ ] Choosing a saved card fills every field; Pay succeeds and the request is filed with its number
- [ ] An invalid number, past expiry or short CVC blocks Pay with a message next to the field, announced to screen readers
- [ ] The network request carries no full card number or CVC (asserted in e2e)
- [ ] The page never says "mock", "test" or "demo", and has no Stripe name or logo
**Verification:** Playwright: saved-card path, invalid-card path, decline path, and request-body inspection; integration test for the new route; desktop and 375px.
**Dependencies:** T3
**Files:** `app/pay/[checkoutId]/page.tsx` (replaces `pay/mock`), `app/pay/[checkoutId]/card-form.tsx`, `components/card-brand-icon.tsx`, `app/api/payments/checkout/[id]/route.ts`, `lib/services/payments.ts`
**Size:** M

#### Task 5: Payment receipt
**Description:** Store the card brand and last 4 digits on the payment (schema change), and show "Paid ₹10 with Visa •••• 4242" on the timeline, in the filed email and on the pay page for extra fees.
**Acceptance criteria:**
- [ ] Brand and last 4 are saved; nothing else about the card is
- [ ] Timeline and email show the receipt line
**Verification:** Integration test; migration runs on a fresh database and on Neon.
**Dependencies:** T4
**Files:** `lib/db/schema.ts`, `drizzle/0001_*.sql`, `lib/services/payments.ts`, `components/timeline.tsx`
**Size:** S

### Checkpoint 2
- [ ] File → card checkout → number assigned works on production, desktop and phone
- [ ] Full card number and CVC never appear in server logs or network bodies

### Phase 3: Gemini AI

#### Task 6: Gemini client, limits and fallbacks
**Description:** `lib/ai/gemini.ts` wrapping `@google/genai` with a 15 s timeout, JSON-schema responses, clean error types (no key, timeout, quota, blocked), and a per-user limit of 20 calls an hour stored in the database. Unit tests use a fake client; no real API calls in tests.
**Acceptance criteria:**
- [ ] Without `GEMINI_API_KEY` the AI routes return a clear "AI features are switched off" error and the UI hides or disables the buttons
- [ ] The 21st call in an hour is refused with a message saying when to try again
- [ ] The key never reaches the browser bundle (checked with a build-output search)
**Verification:** `npm test`; `grep -r GEMINI .next/static` finds nothing.
**Dependencies:** None
**Files:** `lib/ai/gemini.ts`, `lib/ai/limits.ts`, `lib/db/schema.ts` (ai_usage table), `tests/integration/ai.test.ts`
**Size:** M

#### Task 7: Rewrite formally
**Description:** A "Rewrite formally" button under the request text. Gemini rewrites it as a formal RTI request in the **same language**, keeping every fact, date, number and `[placeholder]` and inventing nothing. While it works, the text area shows a shimmer and "Rewriting…" is announced. The result appears as a preview: Use rewrite / Keep mine, with Undo after using it.
**Acceptance criteria:**
- [ ] Hindi in, Hindi out; numbers like `PPO/2019/4471` survive unchanged (checked in code after the model replies; rejected and retried once if they don't)
- [ ] The citizen's text is never replaced without clicking Use rewrite
- [ ] Loader, success and error states are all announced
**Verification:** Integration test with a fake model, including the "dropped a number" rejection; Playwright with the AI route stubbed.
**Dependencies:** T6, T1
**Files:** `app/api/ai/rewrite/route.ts`, `lib/ai/rewrite.ts`, `app/requests/new/rewrite-panel.tsx`, `app/requests/new/filing-wizard.tsx`
**Size:** M

#### Task 8: Recommended department tag
**Description:** On the department step, Gemini picks the best match from the seeded central authorities (the response is constrained to their IDs) and returns a one-line reason. It's shown as a "Recommended" tag with an AI icon at the top of the list, and the reason is in an InfoTip. Skeleton tags show while loading; keyword suggestions stay as the fallback.
**Acceptance criteria:**
- [ ] A train-refund request recommends Railways with a short reason
- [ ] An ID that isn't in the list is impossible (schema enum) and ignored if returned
- [ ] With AI off or slow, keyword suggestions appear within 1 s
**Verification:** Integration test with a fake model; Playwright with the route stubbed for success, slow and failure.
**Dependencies:** T6
**Files:** `app/api/ai/suggest-authority/route.ts`, `lib/ai/suggest-authority.ts`, `app/requests/new/filing-wizard.tsx`
**Size:** M

### Checkpoint 3
- [ ] With the real key on production: rewrite and recommendation work in English and Hindi
- [ ] With the key removed locally: the app works and explains that AI is off

### Phase 4: Icons, help and accessibility

#### Task 9: Icons across the app
**Description:** Icons on navigation, landing cards, status pills, timeline events, officer queues, file uploads and key buttons. Decorative icons are `aria-hidden`; icon-only buttons have labels.
**Acceptance criteria:**
- [ ] Every timeline event type and every status has an icon
- [ ] No icon is the only way information is shown (text always present)
**Verification:** axe-core check (T11); visual check in both themes at 375px and desktop.
**Dependencies:** T1
**Files:** `components/site-header.tsx`, `components/timeline.tsx`, `components/pill.tsx`, `components/officer-queue.tsx`, `app/page.tsx`
**Size:** M

#### Task 10: Help buttons and Help page
**Description:** InfoTips next to RTI terms and tricky fields: CPIO, nodal officer, BPL, life or liberty, registration number, the paused clock, first appeal, and the state-office warning. A `/help` page with a short FAQ, linked from the header and footer.
**Acceptance criteria:**
- [ ] Each term above has an InfoTip in plain language, citing the RTI Act section where relevant
- [ ] `/help` is reachable from every page
**Verification:** Playwright opens each InfoTip with the keyboard; content review.
**Dependencies:** T1
**Files:** `app/help/page.tsx`, `lib/help-content.ts`, the wizard, case page and pay page
**Size:** M

#### Task 11: Accessibility pass
**Description:** Add `@axe-core/playwright` and scan the landing, sign-in, filing (every step), checkout, case, officer and stats pages in light and dark. Fix every issue found: heading order, landmarks, label links, error summaries that take focus, focus after actions, colour contrast, and `lang="hi"` on Hindi text where it can be detected.
**Acceptance criteria:**
- [ ] Zero axe violations (serious or critical) on all scanned pages in both themes
- [ ] File → pay → see timeline works with the keyboard alone
- [ ] Lighthouse accessibility ≥ 95 on the landing, filing and case pages
**Verification:** `npm run test:e2e -- e2e/a11y.spec.ts`; Lighthouse via DevTools.
**Dependencies:** T2, T4, T7, T8, T9, T10
**Files:** `e2e/a11y.spec.ts`, fixes across components
**Size:** M

### Checkpoint 4
- [ ] All unit, integration and e2e tests pass; deployed; production checked on desktop and phone
- [ ] README and SPEC updated (new env vars, AI, checkout, a11y)

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A visitor types a real card on the public site | High | Card number and CVC stay in the browser; only brand + last 4 reach the server; footer disclaimer stays |
| Looking too much like Stripe | Medium | Similar layout only; no Stripe name, logo or copy |
| Gemini free-tier rate limits during the demo | Medium | Per-user limit, fast keyword fallback, clear "try again" message |
| Gemini free tier may use prompts to improve Google's products | Medium | A one-line note by the AI buttons ("Sent to Google Gemini"); demo data only |
| Model rewrites facts or numbers | Medium | Numbers and placeholders checked in code; rewrite is preview-only |
| API key exposure | High | Server-only; you add it to `.env.local` and Vercel yourself |
| More moving parts slow pages | Low | Icons tree-shaken; AI calls only on button press or on reaching the department step |

## Open questions (my proposal in brackets)

1. **Saved cards:** [Visa `4242 4242 4242 4242`, "Asha Sharma", 12/30; Mastercard `5555 5555 5555 4444`, "Ravi Kumar", 08/29. Both are the networks' published test numbers and pass validation. One click fills every field, including the CVC.]
2. **Failure path:** [`4000 0000 0000 0002` is declined with "Your card was declined", so the failure screen can still be demoed. Not one of the saved cards.]
3. **Disclosure:** [No "mock"/"test" wording on the checkout, as you asked. The site-wide footer stays, and card details never leave the browser.]
4. **Rewrite language:** [Keep the citizen's language: Hindi stays Hindi.]
5. **New dependencies:** [`lucide-react`, `@google/genai`, and `@axe-core/playwright` (dev only).]
6. **Schema changes:** [`payments.card_brand`, `payments.card_last4`, and a new `ai_usage` table.]
7. **Gemini key:** [You add `GEMINI_API_KEY` to `.env.local` and to Vercel yourself. Please don't paste it into the chat.]
