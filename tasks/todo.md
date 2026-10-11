# RTI Online v2: To-do

Details in [plan.md](plan.md). v1 is done: see [todo-v1.md](todo-v1.md).

## Phase 1: Foundations
- [ ] T1 Icons and accessibility building blocks (InfoTip, skip link, announcer, focus styles)
- [ ] T2 Loaders between pages and on actions
- [ ] **Checkpoint 1:** tests pass; deployed and checked

## Phase 2: Card checkout
- [ ] T3 Card rules library (brand, Luhn, expiry, CVC, formatting)
- [ ] T4 Checkout page (saved cards, live brand icon, inline errors; only brand + last 4 sent)
- [ ] T5 Payment receipt (brand + last 4 on timeline and email)
- [ ] **Checkpoint 2:** card checkout works on production; no card data leaves the browser

## Phase 3: Gemini AI
- [ ] T6 Gemini client, limits and fallbacks
- [ ] T7 Rewrite formally (preview, same language, facts preserved)
- [ ] T8 Recommended department tag (with keyword fallback)
- [ ] **Checkpoint 3:** AI works on production in English and Hindi; app works with AI off

## Phase 4: Icons, help and accessibility
- [ ] T9 Icons across the app
- [ ] T10 Help buttons and Help page
- [ ] T11 Accessibility pass (axe-core in both themes, keyboard-only path, Lighthouse ≥ 95)
- [ ] **Checkpoint 4:** everything deployed and checked; README and SPEC updated
