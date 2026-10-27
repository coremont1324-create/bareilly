# Architecture

```
Browser ──► Express server (Node 22) ──► PostgreSQL
            ├─ /api/*            REST JSON API (public, auth, admin)
            ├─ /assets/*, files  built React client (immutable caching)
            └─ /* (HTML)         index.html with per-page <title>, meta, canonical, JSON-LD
```

**One deployable.** The Express server serves both the API and the built single-page app.
For SEO, HTML responses are rendered from `client/dist/index.html` with page-specific meta
tags (scheme name and description, `GovernmentService` JSON-LD) and the correct HTTP status
(404 for unknown or unpublished schemes). `sitemap.xml` lists published schemes.

**Shared rules.** `shared/` holds the zod input schemas, the publishing checklist, the
official-link check and the effective-status rule. The admin form evaluates the checklist
live with the same code the server uses to accept or reject a publish request, so the UI and
the API cannot disagree.

## Layers (server)

| Layer | Files | Responsibility |
| --- | --- | --- |
| Routes | `routes/*.ts` | HTTP shape: parse/validate input with zod, call services, return JSON |
| Middleware | `middleware/*.ts` | Session loading, `requireAuth`, `requireRole`, CSRF/origin checks, `no-store` |
| Services | `services/*.ts` | Business rules, SQL, transactions, audit logging |
| Data | `db/*` | Pool (DATE columns as strings), migration runner, seed |

Errors are thrown as `HttpError` and rendered by one error handler; zod and Postgres errors
(foreign-key, unique, check) map to 400/409 with field details.

## Data model

```
states 1─* districts 1─* mandals *─* schemes (scheme_mandals) ; schemes.available_all_mandals
categories 1─* schemes *─1 departments
schemes *─* beneficiary_groups (scheme_beneficiary_groups)        ← "Eligibility" filter
schemes 1─* scheme_verifications                                  ← who verified what, when, against which source
schemes 1─* notices
admin_users 1─* sessions ; admin_users → created_by / updated_by on schemes & notices
audit_log (entity_type, entity_id, action, actor, changes jsonb, created_at)
settings (key → jsonb)  ; mandal_offices (one per mandal, is_verified)
```

Key columns on `schemes`: `publication_status` (draft/published/archived),
`application_status` (open/closed/year_round/tbc), `deadline`, `tbc_fields text[]`,
`verification_source`, `last_verified_on`, `review_due_on`, `version` (optimistic locking),
`search_text` / `search_compact` (trigram-indexed search columns maintained by the service).

## Search

Queries are normalised (lower case, collapsed whitespace). A scheme matches when **all tokens**
appear in `search_text`, **or** the punctuation-free query appears in `search_compact`
(`pm-kisan` → `pmkisan`), **or** `word_similarity` against name + keywords ≥ 0.55 (small typos).
LIKE wildcards in user input are escaped. Results default to relevance when a query is present.

## Security

- Passwords: bcrypt (cost 12); constant-time path for unknown emails; min 12 characters.
- Sessions: 32-byte random token in an `HttpOnly`, `SameSite=Lax`, `Secure` (prod) cookie;
  only its SHA-256 is stored; sessions are revoked on deactivation or password reset.
- CSRF: state-changing API calls require `X-Requested-With: mandal-portal` and a same-origin
  `Origin` header; no CORS is granted.
- Authorization on every admin endpoint (`requireAuth`), role checks on users/settings/offices
  (`requireRole('super_admin')`); self-demotion and removing the last super admin are blocked.
- Rate limiting on sign-in; Helmet security headers with a strict CSP (`script-src 'self'`).
- Input validation with zod on every endpoint; URLs limited to http(s); official links further
  limited to HTTPS on approved domains before they are shown.
- Audit timestamps, authorship, versions and publication state are always server-generated.

## Client

React 18 + React Router (data router, used for the unsaved-changes guard) + TanStack Query
for loading/error/empty states and caching. Tailwind CSS design tokens (`navy`, `ocean`,
`brand`, `surface`, `ink`) implement the reference palette. Icons: `lucide-react`.
Preferences (mandal, language, text size, contrast) are stored in `localStorage` with safe
fallbacks.
