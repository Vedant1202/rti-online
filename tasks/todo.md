# RTI Online v3 (Redesign): To-do

Details in [plan.md](plan.md). Spec: [SPEC.md → Version 3](../SPEC.md#version-3-redesign-october-2026). v2 is done: see [todo-v2.md](todo-v2.md).

## Phase 1: Foundations
- [ ] T1 UX4G tokens and type (palette light/dark, Noto Sans, buttons, fields)
- [ ] T2 Text size control (A− / A / A+, saved, no flash)
- [ ] T3 Translation groundwork (English dictionary, getDict, LangProvider)
- [ ] T4 Utility bar, one-row header, translatable footer and skip link
- [ ] T5 Phone tab bar (Home, File, My requests, Help)
- [ ] **Checkpoint 1:** tests pass; deployed; user sees the new look

## Phase 2: Citizen flows
- [ ] T6 `nextAction()` and `stageFor()` (pure, unit-tested)
- [ ] T7 Home page that shows what needs doing
- [ ] T8 Case-page stepper, days left, sticky next action
- [ ] T9 More authorities (about 24, 12+ ministries, Hindi keywords)
- [ ] T10 Authority picker (Popular chips, grouped Browse all, search)
- [ ] T11 Two-step filing with direct checkout (6 clicks)
- [ ] **Checkpoint 2:** tests pass; Neon seeded; deployed; user sees the flows

## Phase 3: Hindi interface
- [ ] T12 Move case-page text into the dictionary
- [ ] T13 Move My requests, sign-in and checkout text into the dictionary
- [ ] T14 Move help topics and the Help page into the dictionary
- [ ] T15 Hindi dictionary and language switch
- [ ] **Checkpoint 3:** tests pass in Hindi; teammate review of strings

## Phase 4: Evidence and wrap-up
- [ ] T16 Before/after screenshots and click counts (`docs/redesign/`)
- [ ] T17 Final checks (Lighthouse at 100% and 125%, both themes) and docs
- [ ] **Checkpoint 4:** all v3 success criteria met
