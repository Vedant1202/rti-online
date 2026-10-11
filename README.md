# RTI Online Rebuild

A student rebuild of [rtionline.gov.in](https://rtionline.gov.in), the portal for filing Right to
Information requests and first appeals with central government authorities. It copies the real
portal's roles, deadlines and registration-number format, and fixes problems documented in the
portal's own FAQ and user manual.

Student project. Not affiliated with DoPT or the Government of India. Use fake data only.

See [SPEC.md](SPEC.md) for the specification and [tasks/plan.md](tasks/plan.md) for the build plan.

## What it does

- **Citizens** sign in with an emailed code, file a request in any language (with templates and
  autosaved drafts), get a warning before paying if the request is about a state body, pay ₹10
  through a mock gateway, and get a registration number at once. One case page shows every step,
  including transfers and split parts, with the reply deadline and when an appeal opens.
- **Nodal officers** forward each request to a CPIO, split it across several CPIOs, or transfer it
  to another authority within 5 days (RTI Act s.6(3)).
- **CPIOs** reply, reject with reasons, ask for an itemised additional fee (the reply clock pauses,
  s.7(3)), ask for documents, and decide life-or-liberty claims (48-hour limit).
- **Appellate authorities** decide first appeals within 30 days, or 45 with a recorded reason
  (s.19(6)). Citizens can download a case bundle for a second appeal to the CIC.
- **Everyone** can see public reply-time stats per ministry.

## Tech stack

Next.js 16 (App Router) with TypeScript, Tailwind CSS 4, Drizzle ORM, Neon Postgres in production
and embedded PGlite locally, Vercel Blob for PDFs, Nodemailer with Gmail for email, Zod, jose,
Vitest and Playwright. Everything runs on free tiers.

## Run it locally

No accounts needed. Local development uses an embedded database in `.data/pglite` and shows
sign-in codes on screen.

```bash
npm install
cp .env.example .env.local
```

Set `SEED_EMAIL_BASE` in `.env.local` to any address (for example `team@example.com`), then:

```bash
npm run dev
```

Open http://localhost:3000. A fresh local database seeds itself with 4 authorities and their
officers. To add demo cases in every state:

```bash
npm run db:seed:demo
```

### Demo accounts

Officer accounts are plus-addresses of `SEED_EMAIL_BASE`. With `team@example.com`:

| Role | Email |
|---|---|
| Nodal officer, Pension | `team+doppw.nodal@example.com` |
| CPIOs, Pension | `team+doppw.cpio1@example.com`, `team+doppw.cpio2@example.com` |
| Appellate authority, Pension | `team+doppw.faa@example.com` |
| Demo citizen (after `db:seed:demo`) | `team+citizen.asha@example.com` |

Other authorities use the codes `dopat`, `morly` and `mhome`. Any other email signs in as a new
citizen. With Gmail configured, plus-addresses arrive in the team inbox.

To reset the local database, stop the server and delete `.data/pglite`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm test` | Unit and integration tests (in-memory Postgres) |
| `npm run test:e2e` | Playwright end-to-end tests, desktop and 375px |
| `npm run db:generate` | Create a migration from `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` (or the local database) |
| `npm run db:seed` | Authorities and officer accounts |
| `npm run db:seed:demo` | Demo cases in every state |

## Deploy (free)

1. Push the repo to GitHub as a **public** repository. Vercel's free plan blocks deployments from
   other people's commits on private repos.
2. Create a free Neon project and copy its connection string.
3. Create a Gmail account for the team, turn on 2-Step Verification, and create an App Password.
4. Import the repo in Vercel (Hobby plan). Add a Blob store (Storage tab, private access).
5. Set these environment variables in Vercel: `DATABASE_URL`, `SESSION_SECRET` (32+ random
   characters), `OTP_PEPPER`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `SEED_EMAIL_BASE` (the Gmail
   address), `MOCK_PAYMENT_SECRET`, `CRON_SECRET`, `APP_URL` (your `https://….vercel.app` URL),
   and optionally `EMAIL_ALLOWLIST` and `DEMO_SHOW_OTP=true` as a live-demo fallback.
   `BLOB_READ_WRITE_TOKEN` is added by Vercel when you connect the Blob store.
6. Run migrations and seed against Neon from your machine:

   ```bash
   DATABASE_URL="postgres://…" npm run db:migrate
   DATABASE_URL="postgres://…" SEED_EMAIL_BASE="team@gmail.com" npm run db:seed
   ```

Vercel serves the site over HTTPS and runs the daily reminder job from `vercel.json`.

## Project structure

```
app/               pages and API route handlers (app/api/**/route.ts)
components/        shared UI components
lib/rti/           legal rules as pure functions: deadlines, registration numbers, fees, word count
lib/services/      business logic used by route handlers (requests, payments, nodal, cpio, appeals…)
lib/db/            Drizzle schema and database connection
lib/contract.ts    shared statuses, event types and Zod input schemas
data/              authorities, templates and state-body terms
drizzle/           generated migrations
scripts/           migrate, seed and demo-data scripts
tests/             Vitest unit and integration tests
e2e/               Playwright end-to-end tests
```

## Git workflow

Branch from `dev` and open pull requests into `dev`. `main` only receives `dev` → `main` merges.
