# Mandal Schemes Portal

A government welfare-scheme discovery portal. Citizens choose their mandal, search and
filter schemes, read eligibility, benefits, required documents and application steps, and
follow **verified** links to official application websites. Administrators manage schemes,
notices, verification sources, deadlines and publication status in a protected admin area.

> **Not an official government website.** The portal uses an original logo (no national or
> state emblem) and shows a disclaimer on every page. Seed records are labelled *Demo*.

## Contents

- [Features](#features)
- [Project structure](#project-structure)
- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [Database, seed data and the first admin](#database-seed-data-and-the-first-admin)
- [Testing](#testing)
- [Production build and deployment](#production-build-and-deployment)
- [Architecture](docs/ARCHITECTURE.md) · [API reference](docs/API.md) · [Data sources](docs/DATA_SOURCES.md)
- [Known limitations](#known-limitations)

## Features

| Area | What works |
| --- | --- |
| **Home** | Rural hero illustration, working search, selected-mandal indicator, six category quick links (pre-filtered listing), featured schemes and latest notices from the API, help-desk band. |
| **Schemes directory** | Debounced search tolerant of case/spacing/punctuation (`PM-KISAN` = `pm kisan` = `pmkisan`) plus small typos; filters for category, department, eligibility group, status and "only my mandal"; sorting; pagination; category sidebar with live counts; empty state with reset. URL holds all filter state. |
| **Scheme details** | Overview, Eligibility, Benefits, Required Documents, How to Apply, Help & Support and Updates with scroll-spy navigation; Apply / Download guidelines / Share / Back / Contact support; source, last-verified and last-updated dates; warnings for "To be confirmed", overdue review and demo records. Server-rendered `<title>`, description, canonical URL and JSON-LD; `sitemap.xml` and `robots.txt`. |
| **Help & Information** | Searchable, keyboard-operable FAQ accordions; how-to-apply guide; mandal office contacts (only verified ones are shown); accessibility controls (text size, high contrast); language selector. |
| **Languages** | English, Hindi and Telugu interface translations (all keys, test-enforced). Scheme content is shown as entered by administrators. |
| **Admin** | Cookie-session sign-in, dashboard metrics computed from the database, scheme list by status, full add/edit form with live publishing checklist, draft → publish → unpublish / archive → restore, preview of any state, audit history and verification records, notices management, users & roles (super admin), settings (help desk, approved official domains, default mandal, mandal offices). |
| **Data integrity** | Links count as official only when HTTPS on an approved domain (`gov.in`, `nic.in` by default) and are filtered on the server; an "open" scheme whose deadline passed is shown as closed; publishing is blocked until the checklist is complete; unconfirmed items must be explicitly marked "To be confirmed" and acknowledged; optimistic locking prevents lost edits; timestamps and authorship are set by the server. |

## Project structure

```
mandal-schemes-portal/
├── shared/            # TypeScript shared by client and server
│   └── src/           # zod schemas, publishing checklist, link & status rules, types
├── server/            # Express + PostgreSQL API, also serves the built client
│   ├── src/
│   │   ├── app.ts            # middleware, routers, security headers
│   │   ├── seo.ts            # per-page meta tags, JSON-LD, sitemap, robots
│   │   ├── routes/           # public.ts, auth.ts, admin.ts
│   │   ├── services/         # schemes, notices, users, settings, meta, audit
│   │   ├── middleware/       # session auth, roles, CSRF/origin checks
│   │   ├── db/               # pool, migration runner, migrations/*.sql, seed
│   │   └── scripts/          # migrate, seed, createAdmin CLIs
│   └── test/                 # API integration tests (real PostgreSQL)
├── client/            # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/       # Header, Footer, scheme cards, UI primitives, logo
│   │   ├── illustrations/    # original SVG artwork (no stock photos)
│   │   ├── i18n/             # en / hi / te dictionaries + provider
│   │   ├── lib/              # API client, React Query hooks, preferences
│   │   └── pages/            # Home, Schemes, SchemeDetail, Help, Notices, admin/*
│   └── test/                 # component tests (Vitest + Testing Library)
├── e2e/run.cjs        # Playwright browser checks (flows, responsive, console errors)
├── docs/              # architecture, API reference, data sources
├── Dockerfile, docker-compose.yml, render.yaml
└── .env.example
```

## Quick start (local)

Requirements: **Node.js 20+** (22 recommended) and **PostgreSQL 13+** (needs the bundled `pg_trgm` extension).

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env            # then edit DATABASE_URL (and DATABASE_URL_TEST for tests)
createdb mandal_portal          # or create the database however you prefer

# 3. Create tables, reference data, demo records and your admin account
ADMIN_EMAIL=you@example.org ADMIN_PASSWORD='choose-a-long-passphrase-1' npm run db:seed

# 4. Run API (http://localhost:4000) and Vite dev server (http://localhost:5173)
npm run dev
```

Open http://localhost:5173 for the portal and http://localhost:5173/admin for the admin area.
The Vite dev server proxies `/api` to the API.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | PostgreSQL connection string |
| `DATABASE_SSL` | no | `false` | Use TLS to the database (most managed hosts) |
| `PORT` | no | `4000` | HTTP port |
| `NODE_ENV` | no | `development` | `production` enables secure cookies, HSTS and proxy trust defaults |
| `PUBLIC_BASE_URL` | prod | `http://localhost:5173` | Canonical URL for meta tags, sitemap and origin checks |
| `ALLOWED_ORIGINS` | no | — | Extra comma-separated origins allowed to send state-changing requests |
| `SESSION_TTL_HOURS` | no | `8` | Admin session lifetime |
| `COOKIE_SECURE` | no | `true` in production | Force/disable the `Secure` cookie flag |
| `TRUST_PROXY` | no | `true` in production | Trust the first proxy for client IPs (rate limiting) |
| `AUTO_MIGRATE` | no | `true` | Apply pending migrations at server start |
| `LOGIN_RATE_LIMIT` | no | `10` | Failed sign-ins allowed per IP per 15 minutes |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | first run | — | Used once by the seed script to create the first super admin |
| `DATABASE_URL_TEST` | tests | — | Disposable database for the API test suite (it is wiped) |

No secret is ever bundled into the client. `.env` is git-ignored.

## Database, seed data and the first admin

```bash
npm run db:migrate                 # apply migrations only (also runs automatically on start)
npm run db:seed                    # migrations + reference data + labelled demo records
npm run db:seed -- --no-demo       # production: reference data only
npm run db:seed -- --reset-demo    # delete and re-create demo records
npm run admin:create -- --email admin@example.org --name "Asha Rao" --role super_admin
#   password comes from ADMIN_PASSWORD or a hidden prompt (min 12 chars, letters + numbers)
```

After `npm run build` the same commands exist as `db:migrate:prod`, `db:seed:prod` and
`admin:create:prod`, which run the compiled scripts without dev dependencies.

**Reference data** (`server/src/db/seedData.ts`): categories, departments, eligibility groups,
and the mandals of Kurnool revenue division, Kurnool district, Andhra Pradesh. Edit this file
to add states, districts and mandals, then re-run the seed (it is idempotent).

**Demonstration records**: PM-KISAN, AB PM-JAY, PMAY-G and Post Matric Scholarship (SC) are
published; one employment scheme is kept as a draft. Each record names the official source it
was compiled from (see [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)), carries `isDemo = true`,
and leaves anything not confirmed from an official source empty and flagged "To be confirmed".
No deadlines, amounts or phone numbers were invented. **Re-verify every record before going
live**, or seed production with `--no-demo` and enter verified data through the admin area.

## Testing

```bash
npm run typecheck        # shared + server + client
npm test                 # unit (shared), API integration (server, needs DATABASE_URL_TEST), components (client)

# Browser end-to-end checks against a running, seeded server:
npm run build && npm start &
BASE_URL=http://localhost:4000 ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run test:e2e
```

The e2e script uses the `playwright` package (`npm i -D playwright && npx playwright install chromium`
if it is not already available) and writes screenshots to `e2e/screenshots/`.

## Production build and deployment

```bash
npm ci && npm run build      # client → client/dist, server → server/dist
NODE_ENV=production PUBLIC_BASE_URL=https://schemes.example.org npm start
```

The server serves the API and the built client from one process, so any Node host with
PostgreSQL works.

- **Render**: `render.yaml` is a ready Blueprint (web service + Postgres). Set `PUBLIC_BASE_URL`,
  deploy, then run `ADMIN_EMAIL=… ADMIN_PASSWORD=… node server/dist/scripts/seed.js --no-demo`
  once from the service shell.
- **Docker / any container host** (Railway, Fly.io, Cloud Run, ECS): `docker build -t mandal-portal .`
  then run with `DATABASE_URL`, `PUBLIC_BASE_URL` and `DATABASE_SSL=true` if your database requires TLS.
  `docker compose up --build` starts a local stack with Postgres.
- Put the site behind HTTPS (the hosts above do this). Cookies are `Secure`, `HttpOnly`, `SameSite=Lax`.
- Back up the database regularly — it is the source of truth for all content.

## Known limitations

- **Content verification is a human task.** Demo records were compiled from official sources on
  27 Oct 2026 but must be re-verified by an administrator; several fields are intentionally
  "To be confirmed" (e.g. PMAY-G and PMS-SC application windows, PM-JAY documents).
- **Help-desk and mandal-office contacts are empty by design** until an administrator enters
  verified details — the reference image's sample numbers/emails were not copied.
- **Scheme content is not translated.** Interface text is available in English, Hindi and Telugu;
  scheme text appears as entered. Translations should be reviewed by native speakers before launch.
- **Geography** covers the eight mandals of Kurnool revenue division only; add others in `seedData.ts`.
  There is no admin UI for adding states/districts/mandals yet.
- **Imagery** is original SVG illustration rather than photography, to avoid licensing issues.
- **Not executed in this environment:** the Docker image build and an actual cloud deployment
  (no Docker daemon or hosting credentials were available). Both configurations are provided as-is.
- Password reset is done by a super admin; there is no self-service email reset (no email service configured).
