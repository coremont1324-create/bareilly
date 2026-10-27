# API reference

Base path: `/api`. JSON in and out. Dates are `YYYY-MM-DD`; timestamps are ISO-8601 UTC.

**Errors** always look like:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Some fields are invalid", "details": { "fields": { "name": "…" } } } }
```

Common codes: `VALIDATION_ERROR` / `BAD_REQUEST` (400), `UNAUTHORIZED` / `INVALID_CREDENTIALS` (401),
`FORBIDDEN` / `CSRF` (403), `NOT_FOUND` (404), `CONFLICT` (409, includes version conflicts),
`CHECKLIST_INCOMPLETE` / `TBC_ACK_REQUIRED` / `INVALID_LINK` (422), `RATE_LIMITED` (429).

**State-changing requests** (POST/PUT/PATCH) must send `X-Requested-With: mandal-portal`
and, if the browser sends `Origin`, it must be this site. Admin endpoints need the
`msp_session` cookie set by `/api/auth/login`.

## Public

| Method & path | Description |
| --- | --- |
| `GET /health` | `{ ok: true }` when the database is reachable |
| `GET /meta` | Categories (with published counts), departments, eligibility groups, mandals, `defaultMandalSlug`, verified `helpdesk` or `null` |
| `GET /schemes` | Search/filter published schemes (below) |
| `GET /schemes/featured?mandal=&limit=` | Featured published schemes (max 12) |
| `GET /schemes/:slug?mandal=` | Full details of a published scheme; `availableInMandal` when `mandal` is given; related published notices |
| `GET /notices?limit=&page=` | Published notices whose publication date has arrived, newest first |
| `GET /offices/:mandalSlug` | `{ office }` — only verified mandal office contacts, otherwise `null` |

`GET /schemes` query parameters:

| Param | Example | Notes |
| --- | --- | --- |
| `q` | `pm kisan` | Case/spacing/punctuation-insensitive, tolerant of small typos |
| `category` | `agriculture` | Category slug |
| `department` | `3` | Department id |
| `group` | `students` | Eligibility group slug |
| `status` | `open` \| `closed` \| `year_round` \| `tbc` | Uses the *effective* status (open + past deadline = closed) |
| `mandal`, `availableOnly` | `kallur`, `1` | Restrict to schemes available in that mandal |
| `sort` | `newest` \| `name` \| `deadline` \| `verified` \| `relevance` | Default: relevance with `q`, otherwise newest |
| `page`, `pageSize` | `2`, `6` | `pageSize` ≤ 50, default 6 |

Response: `{ items: SchemeSummary[], page, pageSize, total, totalPages, facets: { categories: { slug: count }, all } }`.
`officialLink` / `applicationLink` / `guidelinesLink` are `{ url, host }` only when the URL is HTTPS on an
approved domain and not flagged "To be confirmed"; otherwise `null`. `deadline` is `null` and `deadlineTbc`
is `true` when the date is unconfirmed.

## Authentication

| Method & path | Body | Description |
| --- | --- | --- |
| `POST /auth/login` | `{ email, password }` | Sets the session cookie; returns `{ user }`. Rate limited. |
| `POST /auth/logout` | — | Deletes the session |
| `GET /auth/me` | — | `{ user }` or 401 |

## Admin (signed in)

| Method & path | Role | Description |
| --- | --- | --- |
| `GET /admin/dashboard` | any | Totals (total/published/draft/archived/upcoming deadlines/awaiting verification/published notices), lists and recent activity |
| `GET /admin/schemes?status=&q=&page=&pageSize=` | any | All schemes incl. drafts/archived |
| `POST /admin/schemes` | any | Create a draft (`SchemeInput`); returns `AdminScheme` with `checklist` |
| `POST /admin/schemes/checklist` | any | Evaluate the publishing checklist for unsaved data |
| `GET /admin/schemes/:id` | any | `AdminScheme` incl. `checklist`, `version`, created/updated by & at |
| `GET /admin/schemes/:id/preview` | any | Citizen view of a scheme in any state |
| `PUT /admin/schemes/:id` | any | Update; body = `SchemeInput` + `version`. Published schemes must still pass the checklist. |
| `POST /admin/schemes/:id/publish` | any | `{ version, acknowledgeTbc? }` — 422 `CHECKLIST_INCOMPLETE` or `TBC_ACK_REQUIRED` |
| `POST /admin/schemes/:id/unpublish` | any | published → draft |
| `POST /admin/schemes/:id/archive` | any | draft/published → archived (nothing is deleted) |
| `POST /admin/schemes/:id/restore` | any | archived → draft |
| `GET /admin/schemes/:id/history` | any | `{ audit: AuditEntry[], verifications: VerificationRecord[] }` |
| `GET /admin/notices?status=` | any | All notices |
| `POST /admin/notices` | any | Create draft notice `{ title, summary, publishedOn, deadline?, schemeId?, officialUrl?, isDemo? }` |
| `GET /admin/notices/:id`, `PUT /admin/notices/:id` | any | Read / update (`+ version`) |
| `POST /admin/notices/:id/{publish,unpublish,archive,restore}` | any | `{ version }` |
| `GET /admin/audit?entityType=&entityId=&limit=` | any | Audit log |
| `GET /admin/settings` | any | Help desk, approved official domains, default mandal |
| `PUT /admin/settings` | super admin | Replace settings |
| `GET /admin/offices` | any | Office record for every mandal |
| `PUT /admin/offices/:mandalId` | super admin | `{ officeName, address?, phone?, email?, hours?, isVerified?, source? }` |
| `GET /admin/users` | super admin | Accounts |
| `POST /admin/users` | super admin | `{ email, name, role, password }` |
| `PATCH /admin/users/:id` | super admin | `{ name?, role?, isActive?, password? }` — deactivation/reset revokes sessions |

### `SchemeInput`

```jsonc
{
  "name": "string (3–160, required)",
  "shortDescription": "string ≤ 400", "overview": "string", "keywords": "string",
  "categoryId": 1, "departmentId": 2,
  "targetGroup": "string", "eligibilitySummary": "string", "benefitsSummary": "string",
  "eligibility": ["…"], "benefits": ["…"], "requiredDocuments": ["…"], "applicationSteps": ["…"],
  "applicationStatus": "open | closed | year_round | tbc",
  "deadline": "YYYY-MM-DD | null",
  "officialUrl": "https://…", "applicationUrl": "https://…", "guidelinesUrl": "https://…",
  "helpPhone": "string", "helpEmail": "email", "helpNotes": "string",
  "availableAllMandals": true, "mandalIds": [1, 2], "beneficiaryGroupIds": [1],
  "tbcFields": ["eligibility", "benefits", "required_documents", "application_steps", "deadline", "official_link", "application_link", "help_contact"],
  "verificationSource": "string", "verificationSourceUrl": "https://…",
  "lastVerifiedOn": "YYYY-MM-DD", "reviewDueOn": "YYYY-MM-DD",
  "notes": "string", "isFeatured": false, "isDemo": false
}
```

Client-supplied ids, timestamps, authors, versions and publication status in this body are ignored.

### Publishing checklist rules

Every item must be complete, or explicitly "To be confirmed" where allowed:

| Item | Complete when | May be TBC |
| --- | --- | --- |
| Name, short description (≥ 20 chars), category, department | present | no |
| Eligibility, benefits, required documents, application steps | ≥ 1 entry | yes |
| Application status | not `tbc` | yes (status `tbc`) |
| Deadline | a date, or status is year-round/closed | yes |
| Official link | official or application URL is HTTPS on an approved domain | yes |
| Help contact | phone, email or notes | yes |
| Last verified date | set, not in the future | no |
| Mandal availability | all mandals or ≥ 1 mandal | no |
| Verification source | ≥ 3 chars | no |
