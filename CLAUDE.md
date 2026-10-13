@AGENTS.md

# Project context

Group 4 college project (Vedant and Archita): rebuild [rtionline.gov.in](https://rtionline.gov.in), the
central government portal for Right to Information requests, as a working site, then redesign it and add
features. Live at https://rti-online-silk.vercel.app. Not affiliated with the Government of India; fake data only.

## The brief (from the course instructor)

- Present a few slides on the problems with the real portal, with screenshots, then show how we fixed them.
- 25 marks for new features, 25 marks for the redesign. The redesign must not look like the existing portal.
- The slides are a companion: most of the presentation is a live demo of the site.

## Where things stand (October 2026)

- **v1–v2:** the full portal (citizen, nodal officer, CPIO, appellate authority), legal deadlines, card
  checkout, emails, Gemini AI ("Rewrite formally", department suggestion).
- **v3:** redesign of the flows on UX4G (Government of India design system): phone layout with a bottom tab
  bar, action-first home page, two-step filing, case page with progress and days left, Hindi, text size.
- **v4:** "Bright civic" visual polish after Archita found v3 bland: indigo-to-violet gradients, Poppins
  headings, icon tiles, illustrations, a days-left ring, confetti on filing, gentle motion.
- Full history and every decision: [SPEC.md](SPEC.md). Plans: [tasks/](tasks/). Before/after screenshots:
  [docs/redesign](docs/redesign/README.md).

## Presentation materials (outside the repo)

- 5 slides: 1 title, 2–3 problems (8 numbered problems with real-portal screenshots), 4 redesign fixes,
  5 feature fixes. Each fix carries the number of the problem it solves. Speaker notes say what to demo.
- Kept in Google Slides (owned by Vedant), plus PDF and PPTX copies, and a 4-page summary PDF.
- Style for anything presentation-facing: simple, non-technical language (product names like Vercel or
  Gemini are fine), no emoji, short. Problems should describe real user frustrations, not nitpicks.

## Working rules

- Commit and push straight to `main`; Vercel deploys `main` automatically. No PRs for this repo.
- Never commit or print secrets. Production keys (Neon, Gmail app password, Gemini, Blob) live only in
  Vercel's settings, managed by Vedant.
- Run `npm test` (Vitest) before pushing. Playwright e2e (`npx playwright test`) is slow; run the specs you touched.
- After editing `app/globals.css`, run `rm -rf .next/cache` before a production build, or it can ship stale CSS.
- Hindi strings live in `lib/i18n/hi.ts` and must match the keys in `lib/i18n/en.ts`.
