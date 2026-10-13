# Implementation Plan: RTI Online v3 (Redesign)

Builds on [SPEC.md → Version 3: Redesign](../SPEC.md#version-3-redesign-october-2026). Earlier plans: [plan-v1.md](plan-v1.md), [plan-v2.md](plan-v2.md). Status: **Draft, awaiting sign-off.** Workflow: commit and push straight to `main`; Vercel deploys each push.

## Overview

Eight redesign items from the audit of rtionline.gov.in, plus before/after evidence for the report:

1. UX4G look: tokens, Noto Sans, and a utility bar.
2. Phone tab bar and a one-row header.
3. Home page that shows what needs doing first.
4. Filing in 2 steps, going straight to checkout.
5. Case-page stepper, days left and a sticky next action.
6. Authority picker with more authorities, Popular chips and a grouped list.
7. Text size A− / A / A+.
8. English/हिन्दी interface.

## Architecture decisions

- **The root layout still never reads cookies.** That's what keeps `loading.tsx` instant.
  - Text size and language are applied before paint by the existing inline script, like the theme. It sets `data-text` and `lang` on `<html>`.
  - Anything with translated text that used to sit in the root layout (skip link, footer) moves into Suspense-wrapped server components that read the cookie, as `SiteHeader` already does.
- **Translations are a typed dictionary, not a library.**
  - `lib/i18n/en.ts` is the source; `hi.ts` is typed as `Dict`, so a missing key fails `tsc`.
  - Server components call `await getDict()`. Client components get the dictionary from a `LangProvider` that the page renders around them, never by reading `document.cookie` during render (that would cause hydration mismatches).
- **Every task that touches a citizen-facing component moves its text into `en.ts` as it goes.** T12–T14 sweep up whatever is left, so Hindi (T15) is only adding translations.
- **The next action and the progress stage are pure functions** (`lib/next-action.ts`, `lib/progress.ts`). Home, My requests and the case page share them and they're unit-tested on their own. They reuse the existing clocks (`caseClocks`, `appealWindow`); legal logic stays in `lib/rti/`.
- **Direct checkout reuses existing endpoints.** The Review step calls `POST /api/requests`, then `POST /api/payments`, and goes to the returned `redirectTo`. No new API, and idempotency is unchanged.
- **UX4G style without the UX4G library.** Tokens are recreated in `globals.css` (Tailwind `@theme`). No Bootstrap and no new dependency.
- **Authorities are seed data, not schema.** `data/authorities.json` grows from 4 to about 24. The upsert is idempotent and also runs on Neon.

## Dependency graph

```
T1 Tokens + type ─┬─► T4 Utility bar + header + footer ─► T5 Tab bar
T2 Text size ─────┤                                  └─► (T15 adds the language switch to the bar)
T3 i18n base ─────┘
T6 nextAction/stageFor ─┬─► T7 Action-first home
                        └─► T8 Case stepper + sticky action
T9 More authorities ─► T10 Authority picker ─► T11 Two-step filing + direct checkout
T3 ─► T12, T13, T14 (string sweeps) ─► T15 Hindi + switch
All ─► T16 Before/after docs ─► T17 Final checks
```

Can run in parallel: T6 and T9; T12, T13 and T14; T16 can start any time after Checkpoint 2.

## Task list

### Phase 1: Foundations

#### Task 1: UX4G tokens and type
**Description:** Replace the palette in `globals.css` with the spec's UX4G light and dark tokens. Add a `--field` border token, switch to Noto Sans plus Noto Sans Devanagari (400/600/700), and restyle `.btn`, `.btn-ghost`, `.input`, `.card` and pills: 6px button corners, 8px card corners, 44px minimum tap height on phones.
**Acceptance criteria:**
- [ ] Every token in the spec is in place for light and dark; nothing uses raw colour values
- [ ] axe-core reports zero serious or critical issues in both themes (existing `a11y.spec.ts`)
- [ ] Form-field borders reach 3:1 against the surface in both themes
**Verification:** `npm run build`; `npx playwright test e2e/a11y.spec.ts e2e/theme.spec.ts`; check home, filing and case pages in both themes by eye.
**Dependencies:** None
**Files:** `app/globals.css`, `app/layout.tsx`
**Size:** S

#### Task 2: Text size control (A− / A / A+)
**Description:** Add `lib/prefs.ts` (cookie names plus `parseTextSize`). Extend the inline pre-paint script to set `data-text` on `<html>`, with CSS `html[data-text=sm|lg]` setting 87.5% / 125%. Add `components/text-size.tsx`: three buttons in a group, with `aria-pressed` and labels like "Text size: larger".
**Acceptance criteria:**
- [ ] The choice survives a reload with no flash of the wrong size
- [ ] At 125% and 375px, no key page scrolls sideways
- [ ] The buttons work with the keyboard and announce their pressed state
**Verification:** Unit test `tests/unit/prefs.test.ts`; new `e2e/text-size.spec.ts` (persistence, plus a no-overflow check at 125% on the 375px project).
**Dependencies:** None (the control is placed in the bar in T4)
**Files:** `lib/prefs.ts`, `components/text-size.tsx`, `app/layout.tsx`, `app/globals.css`, `tests/unit/prefs.test.ts`, `e2e/text-size.spec.ts`
**Size:** M

#### Task 3: Translation groundwork (English only)
**Description:** Create `lib/i18n/en.ts` (nested, `as const`) with `type Dict`. Add `lib/i18n/server.ts` with `getLang()` and `getDict()` reading the `rti_lang` cookie (`parseLang` lives in `lib/prefs.ts`), and `lib/i18n/client.tsx` with `LangProvider` and `useT()`. Add a `format(template, vars)` helper for strings like "Pay {amount}". Include `en`-only date and plural helpers that take the language. No visible switch yet.
**Acceptance criteria:**
- [ ] `getDict()` returns English for a missing or unknown cookie
- [ ] A client component under `LangProvider` renders the same text on the server and the client (no hydration warning)
- [ ] The root layout still doesn't read cookies, and the loader tests still pass
**Verification:** `tests/unit/i18n.test.ts`; `npx playwright test e2e/loaders.spec.ts`; `npm run typecheck`.
**Dependencies:** None
**Files:** `lib/i18n/en.ts`, `lib/i18n/server.ts`, `lib/i18n/client.tsx`, `lib/prefs.ts`, `tests/unit/i18n.test.ts`
**Size:** M

#### Task 4: Utility bar, one-row header, translatable footer
**Description:**
- Add `components/utility-bar.tsx`: an indigo bar reading "Student rebuild · not an official website", with the text-size control, the theme toggle (moved here) and a slot for the language switch. A 3px tricolour strip sits under it.
- Rework `site-header.tsx` into one row: the logo, desktop nav links (File, My requests, Reply times, Help), and Sign in or the account menu.
- Move the skip link and the footer into Suspense-wrapped server components (`SiteHeader`, a new `SiteFooter`) so they can be translated. English placeholders stay in the fallbacks.
**Acceptance criteria:**
- [ ] The header is one row of 64px or less at 375px; the utility bar wraps cleanly on narrow screens
- [ ] Tab from the address bar still reaches "Skip to content" first; `data-testid="disclaimer"` still holds "Not affiliated" and a Help link
- [ ] No emblem and no "Government of India" text anywhere
**Verification:** `npx playwright test e2e/a11y-basics.spec.ts e2e/smoke.spec.ts e2e/help.spec.ts e2e/responsive.spec.ts`; screenshots at 375px and 1280px.
**Dependencies:** T1, T2, T3
**Files:** `components/utility-bar.tsx`, `components/site-header.tsx`, `components/site-footer.tsx`, `app/layout.tsx`, `lib/i18n/en.ts`
**Size:** M

#### Task 5: Phone tab bar
**Description:** Add `components/bottom-nav.tsx`: a client component using `usePathname`, wrapped by a server component (in Suspense) that knows the user's role and language.
- Below 768px, citizens and signed-out visitors see Home, File, My requests and Help, with icons. Signed-out "My requests" goes to sign in.
- The bar is fixed to the bottom, honours `env(safe-area-inset-bottom)` and comes after `<main>` in the DOM.
- `main` gets bottom padding on phones. The bar is hidden on `/pay/*` and for officers.
**Acceptance criteria:**
- [ ] 4 items, each at least 44px tall, with `aria-current="page"` on the active one
- [ ] The last element of every key page is visible above the bar when scrolled to the end
- [ ] Not rendered at 768px or wider, on `/pay/*`, or for officer roles
**Verification:** New `e2e/bottom-nav.spec.ts` (mobile project: items, active state, nothing hidden behind the bar, hidden on checkout; desktop project: absent); axe scan.
**Dependencies:** T4
**Files:** `components/bottom-nav.tsx`, `app/layout.tsx`, `app/globals.css`, `lib/i18n/en.ts`, `e2e/bottom-nav.spec.ts`
**Size:** M

### Checkpoint 1: Foundations
- [ ] `npm run lint && npm run typecheck && npm test && npm run test:e2e` pass
- [ ] Pushed to `main`; production checked in light and dark, at 375px and 1280px, and at all three text sizes
- [ ] Show the user the new look before going on

### Phase 2: Citizen flows

#### Task 6: `nextAction()` and `stageFor()`
**Description:** Two pure functions.
- `nextAction(summary, now)` returns the citizen's next step:
  - `pay_fee`, `pay_additional` (with amount), `upload_document`
  - `read_reply_or_appeal` (with the appeal deadline from `appealWindow`), `appeal_overdue` (no reply, window open)
  - `null`
- `stageFor(status, flags)` maps all 12 statuses to stepper stages (Filed, With officer, Reply, Appeal, Decided) with a tone and a "waiting for you" flag.
**Acceptance criteria:**
- [ ] `stageFor` is tested for all 12 statuses; `nextAction` for each action type, plus the appeal window just before opening, just after closing, and after an appeal is filed
- [ ] No legal timing is duplicated; deadlines come from `lib/rti/`
**Verification:** `npm test -- tests/unit/next-action.test.ts tests/unit/progress.test.ts`
**Dependencies:** None
**Files:** `lib/next-action.ts`, `lib/progress.ts`, `tests/unit/next-action.test.ts`, `tests/unit/progress.test.ts`
**Size:** S

#### Task 7: Home page that shows what needs doing
**Description:**
- **Signed-out:** a UX4G-style hero with File a request and Track my requests buttons, then "How it works" in 4 icon steps, then a link to Reply times.
- **Signed-in citizens:** a greeting, a "Needs your action" list (action cards from `nextAction`, including split parts), an "In progress" list (status plus days left), and the File button. When nothing is pending, show "Nothing needs your attention".
- **Officers:** a banner linking to their queue.
- Extend `listCitizenRequests` to return each request's next action.
**Acceptance criteria:**
- [ ] A citizen with an additional fee waiting reaches the card form in 2 clicks from `/`
- [ ] A citizen with an open appeal window sees "Read the reply" and "Appeal by {date}" on `/`
- [ ] The signed-out home passes axe and has no sideways scroll at 375px
**Verification:** Integration test in `tests/integration/views.test.ts` (next actions in the list, including split parts); new `e2e/home-actions.spec.ts`; `e2e/smoke.spec.ts` updated if needed.
**Dependencies:** T4, T6
**Files:** `app/page.tsx`, `components/action-list.tsx`, `lib/services/views.ts`, `lib/i18n/en.ts`, `e2e/home-actions.spec.ts`
**Size:** M

#### Task 8: Case-page stepper, days left and sticky action
**Description:** Add `components/case-stepper.tsx`: an ordered list with `aria-current="step"` and the stage names visible on phones. Add a days-left bar inside `ClockSummary`, and `components/next-action-bar.tsx`, a sticky bar for the owner: at the bottom on phones (above the tab bar), at the top of the page on desktop. Rebuild the case-page header around them; the timeline stays below.
**Acceptance criteria:**
- [ ] The stepper shows the right stage for filed, fee requested, replied, rejected, appeal filed and appeal decided cases
- [ ] The sticky action shows only for the owner when `nextAction` isn't null, and never hides content or the tab bar
- [ ] Screen readers hear "Step 2 of 5, With officer, current"
**Verification:** `e2e/golden-paths.spec.ts` still passes, with assertions added for the stepper stage at each step; axe scan of the case page.
**Dependencies:** T5, T6
**Files:** `components/case-stepper.tsx`, `components/next-action-bar.tsx`, `components/clock-badge.tsx`, `app/requests/[id]/page.tsx`, `lib/i18n/en.ts`
**Size:** M

#### Task 9: More authorities
**Description:** Grow `data/authorities.json` from 4 to about 24 central public authorities across 12 or more ministries, including Railways, EPFO, Passport (MEA), CBDT, UIDAI, Department of Posts, CBIC, NHAI, ESIC, Food & Public Distribution, Health, Education, MHA and the two DoPT departments. Keep the existing 4 codes unchanged so registration numbers and tests hold. Each needs English and Hindi keywords and a `popular: true` flag for the 6 chips. Each gets 4 officer accounts as plus-addresses through the existing seed.
**Acceptance criteria:**
- [ ] At least 20 authorities across at least 10 ministries; codes unique; the existing 4 unchanged
- [ ] Seed stays idempotent; running it twice changes nothing
- [ ] The keyword suggestion finds the right authority for 6 sample requests, one per popular authority
**Verification:** `tests/integration/seed.test.ts` (counts, idempotency); `tests/unit/suggest.test.ts` (new samples); `npm run db:seed` locally.
**Dependencies:** None
**Files:** `data/authorities.json`, `scripts/seed-data.ts`, `tests/integration/seed.test.ts`, `tests/unit/suggest.test.ts`
**Size:** S

#### Task 10: Authority picker
**Description:** Add `components/authority-picker.tsx`, taking the place of the inline radio list in the wizard:
- the AI "Recommended" tag and keyword suggestions, as today
- 6 Popular chips (`aria-pressed`)
- "Browse all", a disclosure with a search box and a list grouped by ministry (`role="radiogroup"` per group with a ministry heading); search matches name, ministry and keywords, Hindi included
- a compact "Selected: {name} · Change" line once something is chosen
**Acceptance criteria:**
- [ ] A Popular chip selects its authority in one click; the selection shows in the summary line
- [ ] Searching "पेंशन" lists the Department of Pension and Pensioners' Welfare; an empty result shows the state-government note
- [ ] Fully usable by keyboard: arrow keys inside a radio group, Enter to open Browse all
**Verification:** Updated `e2e/ai-suggest.spec.ts` and `e2e/file-request.spec.ts`; axe scan of the filing page.
**Dependencies:** T9
**Files:** `components/authority-picker.tsx`, `app/requests/new/filing-wizard.tsx`, `app/requests/new/page.tsx`, `lib/i18n/en.ts`
**Size:** M

#### Task 11: Two-step filing with direct checkout
**Description:** Merge the "Your request" and "Authority" steps into **Write**: templates, subject, text, rewrite and attachment, with the picker under the text. **Review and pay** shows the summary, the below-poverty-line and life-or-liberty options, and one button: "Pay ₹10 and file", or "File request" for BPL.
- The button calls `POST /api/requests` then `POST /api/payments` and goes to `redirectTo`: the card page, or the case page for BPL.
- `useRecommendation` now runs 1.5 s after typing stops, once the text has at least 8 words, once per distinct text.
- Update `fileViaUi` in `e2e/helpers.ts`.
**Acceptance criteria:**
- [ ] A Playwright test files and pays from `/` in exactly 6 clicks with the saved Visa
- [ ] The state-body warning still shows before payment; the draft still autosaves and restores
- [ ] With the AI stubbed off, no `/api/ai/suggest-authority` call is made for text under 8 words, and at most one per distinct text
**Verification:** `e2e/file-request.spec.ts` (new 6-click test), `e2e/drafts.spec.ts`, `e2e/checkout.spec.ts`, `e2e/golden-paths.spec.ts`; `tests/integration/requests-create.test.ts` unchanged and passing.
**Dependencies:** T10
**Files:** `app/requests/new/filing-wizard.tsx`, `app/requests/new/use-recommendation.ts`, `e2e/helpers.ts`, `e2e/file-request.spec.ts`, `lib/i18n/en.ts`
**Size:** M

### Checkpoint 2: Citizen flows
- [ ] Full suite passes
- [ ] `npm run db:seed` run once against Neon (idempotent); production shows about 24 authorities
- [ ] On production: file in 6 clicks, home shows actions, the case stepper is right through golden path 2
- [ ] Show the user before starting Hindi

### Phase 3: Hindi interface

#### Task 12: Move case-page text into the dictionary
**Description:** Move status labels (`lib/status.ts` → keys), timeline event text, clock wording, citizen actions and the upload-requested panel into `en.ts`.
**Acceptance criteria:**
- [ ] No hard-coded English left in these files (checked with grep)
- [ ] Golden paths unchanged
**Verification:** `npm run typecheck`; `npx playwright test e2e/golden-paths.spec.ts e2e/officer-flow.spec.ts`
**Dependencies:** T3, T8
**Files:** `lib/status.ts`, `components/timeline.tsx`, `components/clock-badge.tsx`, `app/requests/[id]/citizen-actions.tsx`, `app/requests/[id]/upload-requested.tsx`
**Size:** M

#### Task 13: Move My requests, sign-in and checkout text into the dictionary
**Description:** Same sweep for `app/requests/page.tsx`, `app/login/*`, `app/requests/[id]/pay/*` and `app/pay/[checkoutId]/*`. Card-validation messages go through dictionary keys; `lib/card.ts` returns error codes, not English.
**Acceptance criteria:**
- [ ] No hard-coded English left in these files
- [ ] Checkout and login e2e unchanged
**Verification:** `npx playwright test e2e/login.spec.ts e2e/checkout.spec.ts`; `npm test -- tests/unit/card.test.ts`
**Dependencies:** T3, T11
**Files:** `app/requests/page.tsx`, `app/login/login-form.tsx`, `app/pay/[checkoutId]/card-form.tsx`, `app/pay/[checkoutId]/page.tsx`, `lib/card.ts`
**Size:** M

#### Task 14: Move help topics and the Help page into the dictionary
**Description:** `lib/help-content.ts` becomes keyed entries in the dictionary. `HelpTip` and `InfoTip` button labels and the Help page read from it.
**Acceptance criteria:**
- [ ] Every help topic renders from the dictionary; `e2e/help.spec.ts` passes
**Verification:** `npx playwright test e2e/help.spec.ts`
**Dependencies:** T3
**Files:** `lib/help-content.ts`, `components/help-tip.tsx`, `components/info-tip.tsx`, `app/help/page.tsx`, `lib/i18n/en.ts`
**Size:** S

#### Task 15: Hindi dictionary and language switch
**Description:**
- Write `lib/i18n/hi.ts`: plain formal Hindi, with RTI terms people recognise, e.g. "सूचना का अधिकार (RTI)", "प्रथम अपील", "केंद्रीय जन सूचना अधिकारी (CPIO)".
- Add `components/lang-switch.tsx` ("English | हिन्दी", with `lang="hi"` on the Hindi label) to the utility bar. It sets the cookie, updates `<html lang>` and calls `router.refresh()`.
- Dates use `hi-IN`.
**Acceptance criteria:**
- [ ] With हिन्दी selected, every in-scope page shows Hindi interface text and `<html lang="hi">`; officer pages stay English
- [ ] Deleting any key from `hi.ts` fails `npm run typecheck`
- [ ] Golden path 1 passes with the Hindi interface (selectors by test ID or Hindi names)
**Verification:** New `e2e/hindi.spec.ts`; axe scan in Hindi; manual review by a Hindi-speaking teammate (listed in the checkpoint).
**Dependencies:** T12, T13, T14
**Files:** `lib/i18n/hi.ts`, `components/lang-switch.tsx`, `components/utility-bar.tsx`, `lib/format.ts`, `e2e/hindi.spec.ts`
**Size:** M (the Hindi strings are most of the work)

### Checkpoint 3: Hindi
- [ ] Full suite passes; production checked in Hindi at 375px and 1280px
- [ ] A teammate has reviewed the Hindi strings (ask the user who)

### Phase 4: Evidence and wrap-up

#### Task 16: Before/after screenshots and click counts
**Description:** `scripts/capture-redesign.ts` (Playwright, run by hand) captures public pages of rtionline.gov.in (home, guidelines, View Status, the authority list) and the matching pages of ours, at 1280px and 375px. No forms are submitted and no checkboxes ticked. `docs/redesign/README.md` pairs them with short captions and the click-count table from the spec.
**Acceptance criteria:**
- [ ] Before/after pairs for home, filing, status/case, appeal and phone; the click table matches what the e2e tests do
**Verification:** Open `docs/redesign/README.md` on GitHub; the images render.
**Dependencies:** Checkpoint 2 (better after Checkpoint 3, so the Hindi shots can be included)
**Files:** `scripts/capture-redesign.ts`, `docs/redesign/README.md`, `docs/redesign/*.png`
**Size:** S

#### Task 17: Final checks and docs
**Description:** Lighthouse accessibility on home, filing and case pages at 100% and 125% text size, in both themes. Update the README (features, screenshots link) and add a "Changes made during v3" note to SPEC.md.
**Acceptance criteria:**
- [ ] Lighthouse accessibility ≥ 95 on all of those; axe clean
- [ ] Every v3 success criterion in the spec is checked off
**Verification:** Lighthouse runs on production; `npm run test:e2e` against production (`E2E_BASE_URL`) for the read-only specs.
**Dependencies:** T1–T16
**Files:** `README.md`, `SPEC.md`, `tasks/todo.md`
**Size:** S

### Checkpoint 4: Complete
- [ ] All spec success criteria met; deployed; the user has seen it

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Translated text in the root layout makes loaders slow again | High | Language goes through the pre-paint script plus Suspense-wrapped header and footer; `loaders.spec.ts` runs at every checkpoint |
| Hydration mismatch from language on the client | Medium | Client components only read the dictionary from `LangProvider`; never `document.cookie` during render |
| New palette fails contrast | Medium | Contrast checked when choosing tokens; axe in both themes at every checkpoint |
| e2e selector churn from new labels and steps | Medium | Keep accessible names that tests use ("Subject", "What information do you want?"); update helpers in the same commit; never delete tests |
| Debounced recommendation uses up the Gemini quota | Medium | 8-word minimum, 1.5 s idle, once per text, the existing 20-per-hour limit; e2e stubs AI off |
| Seeding Neon with more authorities | Low | Idempotent upsert; existing codes unchanged; officer emails are plus-addresses to the team inbox only |
| Hindi strings read as machine-translated | Medium | Written by hand in plain formal Hindi; a teammate reviews before the demo |
| Tab bar or sticky action covers content | Medium | Bottom padding, safe-area inset, and an e2e check that the last element stays visible |
| 125% text breaks phone layouts | Medium | Text-size e2e checks for sideways scroll at 375px |

## Open questions (defaults chosen; change any before building)

1. Palette: UX4G indigo `#4a2bc2`. Keep our navy instead? **Default: indigo.**
2. Officer pages: new look only, English, desktop layout. **Default: yes.**
3. Who reviews the Hindi strings? **Default: Archita or another Hindi-speaking teammate at Checkpoint 3.**
