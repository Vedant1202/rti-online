# Implementation Plan: RTI Online v4 (Visual polish)

Builds on [SPEC.md → Version 4: Visual polish](../SPEC.md#version-4-visual-polish-october-2026). Earlier plans: [plan-v1.md](plan-v1.md), [plan-v2.md](plan-v2.md), [plan-v3.md](plan-v3.md). Status: **Draft, awaiting sign-off.** Workflow: commit and push straight to `main`; Vercel deploys each push.

## Overview

Make the site attractive without changing what it does, in the "Bright civic" direction: indigo-to-violet gradients with a warm saffron glow, Poppins headings, soft layered cards, coloured icon tiles, illustrations drawn for this project, and calm motion. Then refresh everything that shows the look: screenshots, both decks and both PDFs.

## Architecture decisions

- **Styling stays token-driven.** New gradients, tile tones, shadows and radii are CSS variables in `globals.css` (light and dark), exposed to Tailwind through `@theme`. The token contrast test is extended to cover them, so dark mode and AA contrast stay guaranteed.
- **Poppins comes through `next/font`** (weights 600/700, Latin and Devanagari) as a `--font-display` variable used only by headings and big numbers. Body text stays Noto Sans. This adds no package.
- **Decoration needs no image files or libraries:**
  - Illustrations are small inline SVG components in `components/illustrations.tsx`, coloured from tokens.
  - The hero's product preview is styled HTML, marked `aria-hidden`.
  - Confetti and entrance animations are CSS keyframes.
  - The existing global reduced-motion rule switches all motion off, and a new e2e test proves it.
- **Accessible names, roles and test ids don't change.** Existing selectors keep working, and new elements get their own test ids. Tests are only updated where wording deliberately changes.
- **Materials refresh after the look settles.** New screenshots are committed to `docs/redesign/`, which is public on GitHub, so Google Slides can load them by URL. The Google Slides images are swapped through the connector (`replaceImage`). If that request isn't supported, the fallback is a fresh import from the deck artifact.

## Dependency graph

```
T1 Tokens + type + buttons/cards ─┬─► T3 Shell (header, tab bar, footer)
T2 Motion + illustration kit ─────┤
                                  ├─► T4 Visitor home ─► T5 Citizen home
                                  ├─► T6 Case page (ring, stepper, celebration)
                                  ├─► T7 Sign-in page
                                  ├─► T8 Reply times page
                                  └─► T9 Filing + My requests polish
T4–T9 ─► T10 Screenshots ─► T11 Decks (artifact + Google Slides) ─► T12 PDFs + docs
```

Can run in parallel after Checkpoint 1: T6, T7, T8 and T9.

## Task list

### Phase 1: Foundations

#### Task 1: Tokens, type, buttons and cards
**Description:** Add the gradient stops, four icon-tile tones (light and dark), shadow tokens (`--shadow-sm/md/lg`) and radius tokens to `globals.css`. Load Poppins through `next/font` as `--font-display` for h1–h3. Restyle `.btn` (gradient with a soft coloured shadow), `.btn-ghost`, `.card` (16px corners, layered shadow, a hover lift that only moves on hover) and `.chip`.
**Acceptance criteria:**
- [ ] The token test covers each tile's foreground on its background, and white on each gradient stop, all at least 4.5:1, in light and dark
- [ ] Headings render in Poppins, in English and Hindi (Devanagari glyphs included), with Noto Sans as the fallback
- [ ] Existing a11y, theme and text-size e2e tests still pass
**Verification:** `npm test -- tests/unit/tokens.test.ts`; `npx playwright test e2e/a11y.spec.ts e2e/theme.spec.ts e2e/text-size.spec.ts e2e/hindi.spec.ts`; a screenshot of the home page in both themes.
**Dependencies:** None
**Files:** `app/globals.css`, `app/layout.tsx`, `tests/unit/tokens.test.ts`
**Size:** M

#### Task 2: Motion and illustration kit
**Description:**
- CSS keyframes for fade-up (with a stagger helper), ring and stepper fill, card lift and a confetti burst.
- `components/illustrations.tsx`: about 7 small inline SVGs (four "How it works" steps, two empty states, and the sign-in panel), coloured from tokens and `aria-hidden`.
- `components/icon-tile.tsx`: a lucide icon on a toned tile.
- A new e2e test checks that no element animates under emulated reduced motion.
**Acceptance criteria:**
- [ ] Under `reducedMotion: "reduce"`, every element's computed `animation-name` is `none` on home, case and filing pages
- [ ] Illustrations follow the theme (token colours), and each one is under 4 KB of markup
- [ ] Nothing here adds a package
**Verification:** `npx playwright test e2e/motion.spec.ts`; `npm run typecheck`.
**Dependencies:** T1
**Files:** `app/globals.css`, `components/illustrations.tsx`, `components/icon-tile.tsx`, `e2e/motion.spec.ts`
**Size:** M

#### Task 3: Header, tab bar and footer
**Description:**
- The header becomes sticky with a light blur, and the logo gets a gradient mark.
- The phone tab bar gets a filled pill behind the active icon.
- The footer grows a brand line, page links (Home, File a request, Reply times, Help) and the student notice, on a tinted band.
- New text goes into `en.ts` and `hi.ts`.
- The case page's next-action bar is moved below the sticky header on desktop.
**Acceptance criteria:**
- [ ] The header stays visible while scrolling and is one row of 64px or less at 375px (existing test)
- [ ] The active tab shows the pill and keeps `aria-current="page"`; the tab-bar tests pass
- [ ] The footer still has `data-testid="disclaimer"` containing "Not affiliated" and a Help link
**Verification:** `npx playwright test e2e/header.spec.ts e2e/bottom-nav.spec.ts e2e/smoke.spec.ts e2e/help.spec.ts e2e/case-page.spec.ts`
**Dependencies:** T1
**Files:** `components/site-header.tsx`, `components/bottom-nav-bar.tsx`, `components/site-footer.tsx`, `components/next-action-bar.tsx`, `lib/i18n/en.ts`, `lib/i18n/hi.ts`
**Size:** M

### Checkpoint 1: Foundations
- [ ] Lint, typecheck, unit and full e2e all pass
- [ ] Pushed; production checked in light and dark, at 375px and 1280px, in English and Hindi

### Phase 2: Pages

#### Task 4: Visitor home page
**Description:**
- **Hero:** full-width gradient with a saffron glow, eyebrow, a Poppins headline (60px desktop, 38px phone), lead, and two buttons (white primary, outlined secondary).
- **Preview card:** decorative, `aria-hidden`, built in `components/hero-preview.tsx`. It shows a sample request: stepper, days-left ring and a "Reply received" note.
- **"Why it's better":** 4 feature cards with toned icon tiles.
- **"How it works":** 4 steps with illustrations and a connecting line.
- The Reply times teaser.
- New text goes into both dictionaries.
**Acceptance criteria:**
- [ ] Existing home e2e passes (File a request and Track my requests links, "How it works" list of 4, the RTI info button)
- [ ] The preview card is invisible to screen readers (`aria-hidden`), and axe finds nothing serious in light, dark or Hindi
- [ ] Nothing scrolls sideways at 375px or at 125% text
**Verification:** `npx playwright test e2e/home-actions.spec.ts e2e/a11y.spec.ts e2e/text-size.spec.ts e2e/hindi.spec.ts`; screenshots at 1280 and 375.
**Dependencies:** T2, T3
**Files:** `app/page.tsx`, `components/hero-preview.tsx`, `lib/i18n/en.ts`, `lib/i18n/hi.ts`
**Size:** M

#### Task 5: Citizen home page
**Description:**
- A gradient welcome band with a greeting and two counts ("needs your action", "in progress"), plus the File button.
- Action cards use toned icon tiles (saffron for payments, indigo for documents, teal for replies, rose for appeals) instead of the plain border.
- The empty states use the new illustrations.
- An e2e test checks the counts.
**Acceptance criteria:**
- [ ] The counts match the action list and the in-progress list (a new assertion in `home-actions.spec.ts`)
- [ ] Existing citizen-home tests pass (Needs your action region, `no-actions`, `in-progress` test ids)
- [ ] Each tile's colour is backed by its title text, so colour isn't the only signal
**Verification:** `npx playwright test e2e/home-actions.spec.ts e2e/a11y.spec.ts`
**Dependencies:** T4
**Files:** `app/page.tsx`, `components/action-list.tsx`, `lib/i18n/en.ts`, `lib/i18n/hi.ts`, `e2e/home-actions.spec.ts`
**Size:** M

#### Task 6: Case page: days-left ring, gradient stepper, celebration
**Description:**
- **Days-left ring:** `components/days-left-ring.tsx`, an SVG ring with `role="progressbar"`, label, value and value text, using pure helper math that has unit tests. It replaces the flat bar in `ClockSummary`.
- **Stepper:** the done part of the line fills with the gradient.
- **Celebration:** after filing (`?paid=1` / `?filed=1`), a panel shows the registration number in a large card with a short CSS confetti burst; under reduced motion it's still.
**Acceptance criteria:**
- [ ] Unit tests cover the ring geometry for 0, 1, 15 and 30 of 30 days, and paused and overdue (no ring when overdue)
- [ ] `case-page.spec.ts` passes: the progressbar keeps the name "Days left on the reply clock" and `aria-valuenow`
- [ ] The celebration shows the same registration number as `reg-no`, and the golden paths pass
**Verification:** `npm test -- tests/unit/ring.test.ts`; `npx playwright test e2e/case-page.spec.ts e2e/golden-paths.spec.ts e2e/file-request.spec.ts e2e/motion.spec.ts`
**Dependencies:** T2
**Files:** `components/days-left-ring.tsx`, `components/clock-badge.tsx`, `components/case-stepper.tsx`, `app/requests/[id]/page.tsx`, `tests/unit/ring.test.ts`
**Size:** M

#### Task 7: Sign-in page
**Description:** On desktop, a split layout: on the left a gradient brand panel with the sign-in illustration and three reasons ("Track every request", "Get emails at each step", "Appeal in one click"); on the right the existing form. On phones, a compact gradient header above the form. New text goes into both dictionaries.
**Acceptance criteria:**
- [ ] `login.spec.ts` and every test that signs in through the UI still pass (labels unchanged)
- [ ] Nothing scrolls sideways at 375px; axe is clean in both themes
**Verification:** `npx playwright test e2e/login.spec.ts e2e/a11y-basics.spec.ts e2e/responsive.spec.ts`
**Dependencies:** T2
**Files:** `app/login/page.tsx`, `app/login/login-form.tsx`, `lib/i18n/en.ts`, `lib/i18n/hi.ts`
**Size:** S

#### Task 8: Reply times page
**Description:** Coloured horizontal bars for median reply time: green under 30 days, red over, with the state also in words. Overdue percentages appear as pills, a legend explains the colours, and phones get one card per authority instead of a wide table.
**Acceptance criteria:**
- [ ] The smoke test still counts one row per authority (table on desktop; the cards keep the same `role="row"` structure, or the test is updated to use a test id)
- [ ] Every bar has a text value next to it; nothing scrolls sideways at 375px
**Verification:** `npx playwright test e2e/smoke.spec.ts e2e/responsive.spec.ts e2e/a11y.spec.ts`
**Dependencies:** T1
**Files:** `app/stats/page.tsx`, `lib/i18n/en.ts`, `lib/i18n/hi.ts`, `e2e/smoke.spec.ts`
**Size:** S

#### Task 9: Filing and My requests polish
**Description:**
- Filing:
  - The step pills become a progress bar with the step names.
  - Template chips get small icons, and Popular chips get toned tiles.
  - The selected authority sits on a tinted card.
- My requests: rows become tiled cards with status colour plus text.
**Acceptance criteria:**
- [ ] The 6-click filing test, `authority-picker.spec.ts`, `drafts.spec.ts` and `ai-suggest.spec.ts` pass unchanged
- [ ] The step bar keeps `aria-label="Steps"` with `aria-current="step"`
**Verification:** `npx playwright test e2e/file-request.spec.ts e2e/authority-picker.spec.ts e2e/drafts.spec.ts e2e/ai-suggest.spec.ts e2e/a11y.spec.ts`
**Dependencies:** T1, T2
**Files:** `app/requests/new/filing-wizard.tsx`, `components/authority-picker.tsx`, `app/requests/page.tsx`
**Size:** M

### Checkpoint 2: Pages
- [ ] The full suite passes, including axe in light, dark and Hindi, and the motion test
- [ ] Lighthouse accessibility is at least 95 on home, filing and case pages, in both themes, at 100% and 125% text
- [ ] Pushed; production checked; screenshots shown to the user

### Phase 3: Materials

#### Task 10: Retake screenshots
**Description:**
- Re-run `scripts/capture-redesign.ts` against a local production build with demo data, giving new "after" shots.
- Add the three feature shots (AI rewrite with the recorded real Gemini output, checkout, timeline) to `docs/redesign/` so they have public URLs.
- Update `docs/redesign/README.md` where needed, then push.
**Acceptance criteria:**
- [ ] Every "after" image in `docs/redesign/` shows the v4 look; "before" images are unchanged
- [ ] The raw GitHub URLs of the new images load
**Verification:** Open the README on GitHub; `curl -I` each raw image URL returns 200.
**Dependencies:** Checkpoint 2
**Files:** `scripts/capture-redesign.ts`, `docs/redesign/*.jpg`, `docs/redesign/README.md`
**Size:** S

#### Task 11: Update both decks
**Description:**
- **Deck artifact:** upload the new images and swap their asset links in the cover and the two "How we fixed it" slides.
- **Google Slides:** swap the matching image elements through the connector (`replaceImage` with the public GitHub URLs), then compare thumbnails.
- Text changes only where the look changed the wording, e.g. "A fresh new look".
**Acceptance criteria:**
- [ ] The cover and slides 4–5 show v4 screenshots in both decks; problem slides unchanged
- [ ] The Google Slides thumbnails match the artifact slide for slide
**Verification:** Read back each Google Slides thumbnail; view the artifact (only if the user asks).
**Dependencies:** T10
**Files:** the deck artifact's `project/slides/*.html`; Google Slides via the connector
**Size:** S

#### Task 12: PDFs and docs
**Description:**
- Rebuild `RTI-Online-Summary.pdf` (page 2 images, and v4 mentioned in the features) and `RTI-Online-Presentation.pdf` (from Google Slides thumbnails).
- Add "Changes made during v4" to SPEC.md and a README line.
- Tick the to-do list.
**Acceptance criteria:**
- [ ] Both PDFs show the v4 look; the summary stays 4 pages
- [ ] SPEC and README are updated, and every v4 success criterion is checked off
**Verification:** Read each PDF page; `git status` clean after the final push.
**Dependencies:** T11
**Files:** `SPEC.md`, `README.md`, `tasks/todo.md`, PDFs in the Archita folder
**Size:** S

### Checkpoint 3: Complete
- [ ] Every spec success criterion met; deployed; materials refreshed; the user has been told

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Poppins Devanagari looks heavy or overflows at 125% | Medium | Hindi and text-size overflow tests at every checkpoint; fall back to Noto Sans Devanagari for Hindi headings if needed |
| Gradients or tiles fail contrast in dark mode | Medium | Tokens are contrast-tested in both themes; axe runs in light, dark and Hindi |
| Animations make e2e clicks flaky | Medium | Short animations (≤450 ms) on opacity and transform only; Playwright waits for stable elements; reduced motion if needed for specific tests |
| The sticky header covers the pinned next-action bar or the skip-link target | Medium | Offset sticky elements by the header height; `scroll-margin-top` on anchors; the case-page test checks the bar's position |
| Google Slides connector can't replace images | Low | Fallback: re-import the deck from the artifact (Share › Export) or recreate the image elements with `createImage` |
| Too much decoration hurts load speed | Low | Text hero, inline SVG only, no new JS libraries; Lighthouse at Checkpoint 2 |

## Open questions (defaults chosen)

1. Direction: **"Bright civic"**, as the user left the choice to Claude.
2. Officer pages get the shared styles only. **Default: yes.**
3. Materials (screenshots, decks, PDFs) are refreshed at the end. **Default: yes, part of this plan.**
