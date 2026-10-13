# RTI Online v3 (Redesign): To-do

Details in [plan.md](plan.md). Spec: [SPEC.md → Version 3](../SPEC.md#version-3-redesign-october-2026). v2 is done: see [todo-v2.md](todo-v2.md).

## Phase 1: Foundations
- [x] T1 UX4G tokens and type (palette light/dark, Noto Sans, buttons, fields)
- [x] T2 Text size control (A− / A / A+, saved, no flash)
- [x] T3 Translation groundwork (English dictionary, getDict, LangProvider)
- [x] T4 Utility bar, one-row header, translatable footer and skip link
- [x] T5 Phone tab bar (Home, File, My requests, Help)
- [x] **Checkpoint 1:** tests pass; deployed (shown to the user at the end, as asked)

## Phase 2: Citizen flows
- [x] T6 `nextAction()` and `stageFor()` (pure, unit-tested)
- [x] T7 Home page that shows what needs doing
- [x] T8 Case-page stepper, days left, sticky next action
- [x] T9 More authorities (about 24, 12+ ministries, Hindi keywords)
- [x] T10 Authority picker (Popular chips, grouped Browse all, search)
- [x] T11 Two-step filing with direct checkout (6 clicks)
- [x] **Checkpoint 2:** tests pass; Neon seeded; deployed

## Phase 3: Hindi interface
- [x] T12 Move case-page text into the dictionary
- [x] T13 Move My requests, sign-in and checkout text into the dictionary
- [x] T14 Move help topics and the Help page into the dictionary
- [x] T15 Hindi dictionary and language switch
- [x] **Checkpoint 3:** tests pass in Hindi; deployed
- [ ] A Hindi-speaking teammate reviews `lib/i18n/hi.ts` before the demo

## Phase 4: Evidence and wrap-up
- [x] T16 Before/after screenshots and click counts (`docs/redesign/`)
- [x] T17 Final checks (Lighthouse at 100% and 125%, both themes) and docs
- [x] **Checkpoint 4:** all v3 success criteria met
