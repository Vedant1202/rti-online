# RTI Online Rebuild: To-do

Details for each task are in [plan.md](plan.md). Owners: A = platform, B = citizen side, C = officer side, D = data and rules.

## Week 1: Foundation
- [x] T1 Scaffold and first HTTPS deploy (A)
- [x] T2 Schema, shared contract and seed data (D)
- [x] T3 Legal rules library with tests (D, B helps)
- [x] T4 Email OTP login (A)
- [ ] **Checkpoint 1:** everyone can sign in; contract merged; plan reviewed

## Weeks 2–3: Main path
- [x] T5 Citizen files a request, up to payment (B)
- [x] T6 Mock payment and instant registration number (A)
- [x] T7 Case timeline and "My requests" (B)
- [x] T8 Nodal inbox: forward, split, transfer (C)
- [x] T9 CPIO reply and reject (C)
- [x] T14 Authority suggestion and state-body warning (B)
- [ ] **Checkpoint 2:** file → pay → forward → reply works on the preview URL

## Week 4: Fees, appeals, FAA
- [x] T10 Itemised extra fee with paused clock (C + A)
- [x] T11 CPIO asks for documents (C)
- [x] T12 One-click first appeal (B)
- [x] T13 FAA queue: decide and extend (C)
- [x] T20 End-to-end golden paths (D)
- [ ] **Checkpoint 3:** all must-haves done; 3 golden paths pass on production

## Week 5: Should-haves
- [x] T15 Autosave drafts (B)
- [x] T16 Request templates (B)
- [x] T17 Life-or-liberty claim (C)
- [x] T18 Daily reminder cron (D)
- [x] T19 Public stats page (D)
- [ ] **Checkpoint 4:** spec success criteria 1–9 pass; feature freeze

## Week 6: Stretch and demo
- [x] T21 Second-appeal bundle PDF (C)
- [ ] T22 Hindi interface labels (B) — skipped (stretch)
- [ ] T23 Demo prep and rehearsal (everyone) — demo data and README done; rehearsal and screenshots are yours

## Status (10 Oct 2026)

All checkpoints pass locally: 119 unit/integration tests, 25 end-to-end tests passing (desktop and 375px),
Lighthouse accessibility 100 on the filing page. Still to do: deploy (needs your GitHub, Vercel, Neon
and Gmail accounts), then run the golden paths against the production URL.
