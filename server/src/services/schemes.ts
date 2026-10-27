import {
  checkOfficialLink,
  compactText,
  DEFAULT_PAGE_SIZE,
  escapeLike,
  effectiveStatus,
  evaluateChecklist,
  normalizeQuery,
  slugify,
  todayIST,
  tokenize,
  verificationState,
  type AdminScheme,
  type ApplicationStatus,
  type ChecklistResult,
  type Paginated,
  type PublicationStatus,
  type PublicLink,
  type SchemeDetail,
  type SchemeInput,
  type SchemeQuery,
  type SchemeSummary,
  type TbcField,
  type VerificationRecord,
} from '@mandal/shared';
import type pg from 'pg';
import { withTransaction, type DbClient } from '../db/pool';
import { conflict, notFound, unprocessable } from '../lib/errors';
import { diff, recordAudit, type Actor } from './audit';
import { listPublicNotices } from './notices';
import { getOfficialDomains } from './settings';

// ------------------------------------------------------------------ helpers

const BASE_SELECT = `
  SELECT s.*,
         c.slug AS cat_slug, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color,
         d.name AS dept_name,
         cu.name AS created_by_name, uu.name AS updated_by_name
    FROM schemes s
    LEFT JOIN categories c ON c.id = s.category_id
    LEFT JOIN departments d ON d.id = s.department_id
    LEFT JOIN admin_users cu ON cu.id = s.created_by
    LEFT JOIN admin_users uu ON uu.id = s.updated_by`;

const EFFECTIVE_STATUS_SQL = `(CASE WHEN s.application_status = 'open' AND s.deadline IS NOT NULL AND s.deadline < $TODAY::date
                                   THEN 'closed' ELSE s.application_status::text END)`;

function toLink(url: string | null, domains: string[]): PublicLink | null {
  const c = checkOfficialLink(url, domains);
  return c.ok ? { url: c.url, host: c.host } : null;
}

type Row = Record<string, any>;

function toSummary(r: Row, domains: string[], today: string): SchemeSummary {
  const tbc = new Set<TbcField>(r.tbc_fields ?? []);
  const deadlineTbc = tbc.has('deadline') || (r.application_status === 'tbc' && !r.deadline);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortDescription: r.short_description,
    category: r.cat_slug ? { slug: r.cat_slug, name: r.cat_name, icon: r.cat_icon, color: r.cat_color } : null,
    department: r.dept_name ?? null,
    targetGroup: r.target_group,
    eligibilitySummary: r.eligibility_summary,
    benefitsSummary: r.benefits_summary,
    applicationStatus: effectiveStatus(r.application_status, r.deadline, today),
    deadline: tbc.has('deadline') ? null : r.deadline,
    deadlineTbc,
    officialLink: tbc.has('official_link') ? null : toLink(r.official_url, domains),
    applicationLink: tbc.has('application_link') || tbc.has('official_link') ? null : toLink(r.application_url, domains),
    lastVerifiedOn: r.last_verified_on,
    isDemo: r.is_demo,
    isFeatured: r.is_featured,
    updatedAt: r.updated_at.toISOString(),
  };
}

function toAdmin(r: Row, mandalIds: number[], groupIds: number[]): AdminScheme {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortDescription: r.short_description,
    overview: r.overview,
    keywords: r.keywords,
    categoryId: r.category_id,
    departmentId: r.department_id,
    targetGroup: r.target_group,
    eligibilitySummary: r.eligibility_summary,
    benefitsSummary: r.benefits_summary,
    eligibility: r.eligibility,
    benefits: r.benefits,
    requiredDocuments: r.required_documents,
    applicationSteps: r.application_steps,
    applicationStatus: r.application_status,
    deadline: r.deadline,
    officialUrl: r.official_url,
    applicationUrl: r.application_url,
    guidelinesUrl: r.guidelines_url,
    helpPhone: r.help_phone,
    helpEmail: r.help_email,
    helpNotes: r.help_notes,
    availableAllMandals: r.available_all_mandals,
    mandalIds,
    beneficiaryGroupIds: groupIds,
    tbcFields: r.tbc_fields,
    verificationSource: r.verification_source,
    verificationSourceUrl: r.verification_source_url,
    lastVerifiedOn: r.last_verified_on,
    reviewDueOn: r.review_due_on,
    notes: r.notes,
    isFeatured: r.is_featured,
    isDemo: r.is_demo,
    publicationStatus: r.publication_status,
    publishedAt: r.published_at ? r.published_at.toISOString() : null,
    version: r.version,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    createdBy: r.created_by ? { id: r.created_by, name: r.created_by_name } : null,
    updatedBy: r.updated_by ? { id: r.updated_by, name: r.updated_by_name } : null,
    categoryName: r.cat_name ?? null,
    departmentName: r.dept_name ?? null,
  };
}

/** Map stored data to the plain shape the audit diff and checklist use. */
function inputFromAdmin(a: AdminScheme): SchemeInput {
  return {
    name: a.name,
    shortDescription: a.shortDescription,
    overview: a.overview,
    keywords: a.keywords,
    categoryId: a.categoryId,
    departmentId: a.departmentId,
    targetGroup: a.targetGroup,
    eligibilitySummary: a.eligibilitySummary,
    benefitsSummary: a.benefitsSummary,
    eligibility: a.eligibility,
    benefits: a.benefits,
    requiredDocuments: a.requiredDocuments,
    applicationSteps: a.applicationSteps,
    applicationStatus: a.applicationStatus,
    deadline: a.deadline,
    officialUrl: a.officialUrl,
    applicationUrl: a.applicationUrl,
    guidelinesUrl: a.guidelinesUrl,
    helpPhone: a.helpPhone,
    helpEmail: a.helpEmail,
    helpNotes: a.helpNotes,
    availableAllMandals: a.availableAllMandals,
    mandalIds: a.mandalIds,
    beneficiaryGroupIds: a.beneficiaryGroupIds,
    tbcFields: a.tbcFields,
    verificationSource: a.verificationSource,
    verificationSourceUrl: a.verificationSourceUrl,
    lastVerifiedOn: a.lastVerifiedOn,
    reviewDueOn: a.reviewDueOn,
    notes: a.notes,
    isFeatured: a.isFeatured,
    isDemo: a.isDemo,
  };
}

export function checklistFor(input: SchemeInput, domains: string[]): ChecklistResult {
  return evaluateChecklist(input, domains);
}

async function buildSearchFields(db: DbClient, input: SchemeInput): Promise<{ text: string; compact: string }> {
  const { rows } = await db.query(
    `SELECT (SELECT name FROM categories WHERE id = $1) AS cat,
            (SELECT name FROM departments WHERE id = $2) AS dept,
            (SELECT string_agg(name, ' ') FROM beneficiary_groups WHERE id = ANY($3::int[])) AS groups`,
    [input.categoryId, input.departmentId, input.beneficiaryGroupIds],
  );
  const extra = rows[0] ?? {};
  const parts = [
    input.name,
    input.keywords,
    input.shortDescription,
    input.overview,
    input.targetGroup,
    input.eligibilitySummary,
    input.benefitsSummary,
    ...input.eligibility,
    ...input.benefits,
    extra.cat,
    extra.dept,
    extra.groups,
  ];
  const text = normalizeQuery(parts.filter(Boolean).join(' '));
  const compact = [input.name, input.keywords, extra.cat, extra.dept]
    .filter(Boolean)
    .map((p) => compactText(String(p)))
    .join(' ');
  return { text, compact };
}

async function uniqueSlug(db: DbClient, name: string): Promise<string> {
  const base = slugify(name);
  const { rows } = await db.query<{ slug: string }>(`SELECT slug FROM schemes WHERE slug = $1 OR slug LIKE $2`, [
    base,
    `${escapeLike(base)}-%`,
  ]);
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

// ------------------------------------------------------------------ public queries

interface WhereBuild {
  where: string[];
  params: unknown[];
}

function addParam(b: WhereBuild, value: unknown): string {
  b.params.push(value);
  return `$${b.params.length}`;
}

function buildPublicWhere(q: SchemeQuery, today: string, opts: { skipCategory?: boolean } = {}): WhereBuild {
  const b: WhereBuild = { where: [`s.publication_status = 'published'`], params: [] };

  if (q.category && !opts.skipCategory) b.where.push(`c.slug = ${addParam(b, q.category)}`);
  if (q.department) b.where.push(`s.department_id = ${addParam(b, q.department)}`);
  if (q.group) {
    b.where.push(`EXISTS (SELECT 1 FROM scheme_beneficiary_groups sbg JOIN beneficiary_groups g ON g.id = sbg.group_id
                           WHERE sbg.scheme_id = s.id AND g.slug = ${addParam(b, q.group)})`);
  }
  if (q.status) {
    const eff = EFFECTIVE_STATUS_SQL.replace('$TODAY', addParam(b, today));
    b.where.push(`${eff} = ${addParam(b, q.status)}`);
  }
  if (q.mandal && q.availableOnly) {
    b.where.push(`(s.available_all_mandals OR EXISTS (SELECT 1 FROM scheme_mandals sm JOIN mandals m ON m.id = sm.mandal_id
                   WHERE sm.scheme_id = s.id AND m.slug = ${addParam(b, q.mandal)}))`);
  }
  const query = normalizeQuery(q.q ?? '');
  if (query) {
    const tokens = tokenize(query);
    const compact = compactText(query);
    const ors: string[] = [];
    if (tokens.length) {
      ors.push(`(${tokens.map((t) => `s.search_text LIKE ${addParam(b, `%${escapeLike(t)}%`)}`).join(' AND ')})`);
    }
    if (compact.length >= 2) ors.push(`s.search_compact LIKE ${addParam(b, `%${escapeLike(compact)}%`)}`);
    if (compact.length >= 4) {
      ors.push(`word_similarity(${addParam(b, query)}, lower(s.name || ' ' || s.keywords)) >= 0.55`);
    }
    // A query made only of punctuation matches nothing rather than everything.
    b.where.push(ors.length ? `(${ors.join(' OR ')})` : 'false');
  }
  return b;
}

function orderBy(q: SchemeQuery, b: WhereBuild): string {
  const sort = q.sort || (q.q ? 'relevance' : 'newest');
  switch (sort) {
    case 'name':
      return 'lower(s.name) ASC, s.id';
    case 'deadline':
      return 's.deadline ASC NULLS LAST, lower(s.name) ASC, s.id';
    case 'verified':
      return 's.last_verified_on DESC NULLS LAST, lower(s.name) ASC, s.id';
    case 'relevance': {
      if (!q.q) return 'COALESCE(s.published_at, s.created_at) DESC';
      const p = addParam(b, normalizeQuery(q.q));
      return `word_similarity(${p}, lower(s.name || ' ' || s.keywords)) DESC, s.is_featured DESC, s.name ASC`;
    }
    default:
      return 'COALESCE(s.published_at, s.created_at) DESC, s.id';
  }
}

export interface PublicListResult extends Paginated<SchemeSummary> {
  facets: { categories: Record<string, number>; all: number };
}

export async function listPublicSchemes(db: DbClient, q: SchemeQuery, today = todayIST()): Promise<PublicListResult> {
  const domains = await getOfficialDomains(db);
  const pageSize = q.pageSize ?? DEFAULT_PAGE_SIZE;
  const b = buildPublicWhere(q, today);
  const whereSql = b.where.join(' AND ');
  const order = orderBy(q, b);
  const limit = addParam(b, pageSize);
  const offset = addParam(b, (q.page - 1) * pageSize);

  const [list, count, facets] = await Promise.all([
    db.query(`${BASE_SELECT} WHERE ${whereSql} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`, b.params),
    (async () => {
      const cb = buildPublicWhere(q, today);
      return db.query(
        `SELECT count(*)::int AS n FROM schemes s LEFT JOIN categories c ON c.id = s.category_id WHERE ${cb.where.join(' AND ')}`,
        cb.params,
      );
    })(),
    (async () => {
      const fb = buildPublicWhere(q, today, { skipCategory: true });
      return db.query(
        `SELECT c.slug, count(*)::int AS n FROM schemes s LEFT JOIN categories c ON c.id = s.category_id
          WHERE ${fb.where.join(' AND ')} GROUP BY c.slug`,
        fb.params,
      );
    })(),
  ]);
  const total = count.rows[0]?.n ?? 0;
  const cats: Record<string, number> = {};
  let all = 0;
  for (const r of facets.rows) {
    if (r.slug) cats[r.slug] = r.n;
    all += r.n;
  }
  return {
    items: list.rows.map((r) => toSummary(r, domains, today)),
    page: q.page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    facets: { categories: cats, all },
  };
}

export async function listFeatured(db: DbClient, opts: { mandal?: string; limit?: number }, today = todayIST()): Promise<SchemeSummary[]> {
  const domains = await getOfficialDomains(db);
  const params: unknown[] = [Math.min(opts.limit ?? 3, 12)];
  let mandalSql = '';
  if (opts.mandal) {
    params.push(opts.mandal);
    mandalSql = `AND (s.available_all_mandals OR EXISTS (SELECT 1 FROM scheme_mandals sm JOIN mandals m ON m.id = sm.mandal_id
                  WHERE sm.scheme_id = s.id AND m.slug = $2))`;
  }
  const { rows } = await db.query(
    `${BASE_SELECT} WHERE s.publication_status = 'published' ${mandalSql}
      ORDER BY s.is_featured DESC, COALESCE(s.published_at, s.created_at) DESC LIMIT $1`,
    params,
  );
  return rows.map((r) => toSummary(r, domains, today));
}

export async function getPublicScheme(db: DbClient, slug: string, mandal?: string, today = todayIST()): Promise<SchemeDetail> {
  const { rows } = await db.query(`${BASE_SELECT} WHERE s.slug = $1 AND s.publication_status = 'published'`, [slug]);
  const r = rows[0];
  if (!r) throw notFound('Scheme not found');
  return buildDetail(db, r, mandal, today);
}

async function buildDetail(db: DbClient, r: Row, mandal: string | undefined, today: string): Promise<SchemeDetail> {
  const domains = await getOfficialDomains(db);
  const tbc = new Set<TbcField>(r.tbc_fields ?? []);
  const [mandals, groups, notices] = await Promise.all([
    db.query(
      `SELECT m.slug, m.name, d.name AS district FROM scheme_mandals sm
         JOIN mandals m ON m.id = sm.mandal_id JOIN districts d ON d.id = m.district_id
        WHERE sm.scheme_id = $1 ORDER BY d.name, m.name`,
      [r.id],
    ),
    db.query(
      `SELECT g.id, g.slug, g.name FROM scheme_beneficiary_groups sbg JOIN beneficiary_groups g ON g.id = sbg.group_id
        WHERE sbg.scheme_id = $1 ORDER BY g.name`,
      [r.id],
    ),
    listPublicNotices(db, { schemeId: r.id, limit: 10, page: 1 }),
  ]);
  let availableInMandal: boolean | null = null;
  if (mandal) availableInMandal = r.available_all_mandals || mandals.rows.some((m) => m.slug === mandal);
  return {
    ...toSummary(r, domains, today),
    overview: r.overview,
    eligibility: r.eligibility,
    benefits: r.benefits,
    requiredDocuments: r.required_documents,
    applicationSteps: r.application_steps,
    guidelinesLink: toLink(r.guidelines_url, domains),
    helpPhone: tbc.has('help_contact') ? null : r.help_phone,
    helpEmail: tbc.has('help_contact') ? null : r.help_email,
    helpNotes: r.help_notes,
    availableAllMandals: r.available_all_mandals,
    mandals: mandals.rows,
    beneficiaryGroups: groups.rows,
    tbcFields: r.tbc_fields,
    verificationSource: r.verification_source,
    verificationSourceUrl: r.verification_source_url,
    reviewDueOn: r.review_due_on,
    publishedAt: r.published_at ? r.published_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
    availableInMandal,
    notices: notices.items,
  };
}

export async function listPublishedSlugs(db: DbClient): Promise<{ slug: string; updatedAt: string }[]> {
  const { rows } = await db.query(`SELECT slug, updated_at FROM schemes WHERE publication_status = 'published' ORDER BY slug`);
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updated_at.toISOString() }));
}

// ------------------------------------------------------------------ admin

async function loadRelations(db: DbClient, id: string): Promise<{ mandalIds: number[]; groupIds: number[] }> {
  const [m, g] = await Promise.all([
    db.query<{ mandal_id: number }>('SELECT mandal_id FROM scheme_mandals WHERE scheme_id = $1 ORDER BY mandal_id', [id]),
    db.query<{ group_id: number }>('SELECT group_id FROM scheme_beneficiary_groups WHERE scheme_id = $1 ORDER BY group_id', [id]),
  ]);
  return { mandalIds: m.rows.map((r) => r.mandal_id), groupIds: g.rows.map((r) => r.group_id) };
}

export async function getAdminScheme(db: DbClient, id: string, forUpdate = false): Promise<AdminScheme> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('Scheme not found');
  if (forUpdate) await db.query('SELECT id FROM schemes WHERE id = $1 FOR UPDATE', [id]);
  const { rows } = await db.query(`${BASE_SELECT} WHERE s.id = $1`, [id]);
  if (!rows[0]) throw notFound('Scheme not found');
  const rel = await loadRelations(db, id);
  const scheme = toAdmin(rows[0], rel.mandalIds, rel.groupIds);
  scheme.checklist = evaluateChecklist(inputFromAdmin(scheme), await getOfficialDomains(db));
  return scheme;
}

/** Admin preview: render the citizen detail view for a scheme in any state. */
export async function getPreview(db: DbClient, id: string): Promise<SchemeDetail & { publicationStatus: PublicationStatus }> {
  const { rows } = await db.query(`${BASE_SELECT} WHERE s.id = $1`, [id]);
  if (!rows[0]) throw notFound('Scheme not found');
  const detail = await buildDetail(db, rows[0], undefined, todayIST());
  return { ...detail, publicationStatus: rows[0].publication_status };
}

export interface AdminListItem {
  id: string;
  slug: string;
  name: string;
  categoryName: string | null;
  departmentName: string | null;
  applicationStatus: ApplicationStatus;
  publicationStatus: PublicationStatus;
  deadline: string | null;
  lastVerifiedOn: string | null;
  verification: 'verified' | 'review_due' | 'unverified';
  isDemo: boolean;
  isFeatured: boolean;
  tbcCount: number;
  updatedAt: string;
  updatedBy: string | null;
}

export async function listAdminSchemes(
  db: DbClient,
  opts: { status?: string; q?: string; page?: number; pageSize?: number },
): Promise<Paginated<AdminListItem>> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.status && ['draft', 'published', 'archived'].includes(opts.status)) {
    params.push(opts.status);
    where.push(`s.publication_status = $${params.length}`);
  }
  if (opts.q && normalizeQuery(opts.q)) {
    params.push(`%${escapeLike(normalizeQuery(opts.q))}%`);
    where.push(`(lower(s.name) LIKE $${params.length} OR s.search_text LIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pageSize = Math.min(opts.pageSize ?? 20, 100);
  const page = Math.max(1, opts.page ?? 1);
  const count = await db.query(`SELECT count(*)::int AS n FROM schemes s ${whereSql}`, params);
  const { rows } = await db.query(
    `${BASE_SELECT} ${whereSql} ORDER BY s.updated_at DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    params,
  );
  const total = count.rows[0].n;
  return {
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      categoryName: r.cat_name,
      departmentName: r.dept_name,
      applicationStatus: r.application_status,
      publicationStatus: r.publication_status,
      deadline: r.deadline,
      lastVerifiedOn: r.last_verified_on,
      verification: verificationState(r.last_verified_on, r.review_due_on),
      isDemo: r.is_demo,
      isFeatured: r.is_featured,
      tbcCount: (r.tbc_fields ?? []).length,
      updatedAt: r.updated_at.toISOString(),
      updatedBy: r.updated_by_name ?? null,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

async function writeRelations(db: DbClient, id: string, input: SchemeInput): Promise<void> {
  await db.query('DELETE FROM scheme_mandals WHERE scheme_id = $1', [id]);
  await db.query('DELETE FROM scheme_beneficiary_groups WHERE scheme_id = $1', [id]);
  if (!input.availableAllMandals && input.mandalIds.length) {
    await db.query(
      `INSERT INTO scheme_mandals (scheme_id, mandal_id) SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING`,
      [id, Array.from(new Set(input.mandalIds))],
    );
  }
  if (input.beneficiaryGroupIds.length) {
    await db.query(
      `INSERT INTO scheme_beneficiary_groups (scheme_id, group_id) SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING`,
      [id, Array.from(new Set(input.beneficiaryGroupIds))],
    );
  }
}

const COLUMN_VALUES = (input: SchemeInput) => [
  input.name,
  input.shortDescription,
  input.overview,
  input.keywords,
  input.categoryId,
  input.departmentId,
  input.targetGroup,
  input.eligibilitySummary,
  input.benefitsSummary,
  JSON.stringify(input.eligibility),
  JSON.stringify(input.benefits),
  JSON.stringify(input.requiredDocuments),
  JSON.stringify(input.applicationSteps),
  input.applicationStatus,
  input.deadline,
  input.officialUrl,
  input.applicationUrl,
  input.guidelinesUrl,
  input.helpPhone,
  input.helpEmail,
  input.helpNotes,
  input.availableAllMandals,
  input.tbcFields,
  input.verificationSource,
  input.verificationSourceUrl,
  input.lastVerifiedOn,
  input.reviewDueOn,
  input.notes,
  input.isFeatured,
  input.isDemo,
];

async function maybeRecordVerification(db: DbClient, id: string, before: SchemeInput | null, after: SchemeInput, actor: Actor | null) {
  if (!after.lastVerifiedOn || !after.verificationSource) return;
  if (
    before &&
    before.lastVerifiedOn === after.lastVerifiedOn &&
    before.verificationSource === after.verificationSource &&
    before.verificationSourceUrl === after.verificationSourceUrl
  )
    return;
  await db.query(
    `INSERT INTO scheme_verifications (scheme_id, source, source_url, verified_on, verified_by, notes) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, after.verificationSource, after.verificationSourceUrl, after.lastVerifiedOn, actor?.id ?? null, ''],
  );
}

export async function createScheme(pool: pg.Pool, input: SchemeInput, actor: Actor | null): Promise<AdminScheme> {
  return withTransaction(pool, async (db) => {
    const slug = await uniqueSlug(db, input.name);
    const search = await buildSearchFields(db, input);
    const values = COLUMN_VALUES(input);
    const { rows } = await db.query(
      `INSERT INTO schemes (name, short_description, overview, keywords, category_id, department_id, target_group,
         eligibility_summary, benefits_summary, eligibility, benefits, required_documents, application_steps,
         application_status, deadline, official_url, application_url, guidelines_url, help_phone, help_email, help_notes,
         available_all_mandals, tbc_fields, verification_source, verification_source_url, last_verified_on, review_due_on,
         notes, is_featured, is_demo, slug, search_text, search_compact, created_by, updated_by, publication_status)
       VALUES (${values.map((_, i) => `$${i + 1}`).join(',')}, $31, $32, $33, $34, $34, 'draft')
       RETURNING id`,
      [...values, slug, search.text, search.compact, actor?.id ?? null],
    );
    const id = rows[0].id as string;
    await writeRelations(db, id, input);
    await maybeRecordVerification(db, id, null, input, actor);
    await recordAudit(db, { entityType: 'scheme', entityId: id, action: 'create', actor, changes: { name: input.name } });
    return getAdminScheme(db, id);
  });
}

export async function updateScheme(pool: pg.Pool, id: string, input: SchemeInput, version: number, actor: Actor): Promise<AdminScheme> {
  return withTransaction(pool, async (db) => {
    const current = await getAdminScheme(db, id, true);
    if (current.version !== version) {
      throw conflict('This scheme was changed by someone else. Reload to see the latest version.', { currentVersion: current.version });
    }
    if (current.publicationStatus === 'published') {
      const check = evaluateChecklist(input, await getOfficialDomains(db));
      if (!check.canPublish) {
        throw unprocessable('CHECKLIST_INCOMPLETE', 'A published scheme must stay complete. Fix the items below or unpublish it first.', {
          checklist: check,
        });
      }
    }
    const before = inputFromAdmin(current);
    const changes = diff(before as unknown as Record<string, unknown>, input as unknown as Record<string, unknown>);
    if (Object.keys(changes).length === 0) return current;
    const search = await buildSearchFields(db, input);
    const values = COLUMN_VALUES(input);
    await db.query(
      `UPDATE schemes SET name=$1, short_description=$2, overview=$3, keywords=$4, category_id=$5, department_id=$6,
         target_group=$7, eligibility_summary=$8, benefits_summary=$9, eligibility=$10, benefits=$11, required_documents=$12,
         application_steps=$13, application_status=$14, deadline=$15, official_url=$16, application_url=$17, guidelines_url=$18,
         help_phone=$19, help_email=$20, help_notes=$21, available_all_mandals=$22, tbc_fields=$23, verification_source=$24,
         verification_source_url=$25, last_verified_on=$26, review_due_on=$27, notes=$28, is_featured=$29, is_demo=$30,
         search_text=$31, search_compact=$32, updated_by=$33, updated_at=now(), version = version + 1
       WHERE id = $34`,
      [...values, search.text, search.compact, actor.id, id],
    );
    await writeRelations(db, id, input);
    await maybeRecordVerification(db, id, before, input, actor);
    await recordAudit(db, { entityType: 'scheme', entityId: id, action: 'update', actor, changes });
    return getAdminScheme(db, id);
  });
}

type Transition = 'publish' | 'unpublish' | 'archive' | 'restore';

const ALLOWED: Record<Transition, { from: PublicationStatus[]; to: PublicationStatus }> = {
  publish: { from: ['draft'], to: 'published' },
  unpublish: { from: ['published'], to: 'draft' },
  archive: { from: ['draft', 'published'], to: 'archived' },
  restore: { from: ['archived'], to: 'draft' },
};

export async function transitionScheme(
  pool: pg.Pool,
  id: string,
  action: Transition,
  opts: { version: number; acknowledgeTbc?: boolean },
  actor: Actor,
): Promise<AdminScheme> {
  return withTransaction(pool, async (db) => {
    const current = await getAdminScheme(db, id, true);
    if (current.version !== opts.version) {
      throw conflict('This scheme was changed by someone else. Reload to see the latest version.', { currentVersion: current.version });
    }
    const rule = ALLOWED[action];
    if (!rule.from.includes(current.publicationStatus)) {
      throw conflict(`Cannot ${action} a scheme that is ${current.publicationStatus}.`);
    }
    if (action === 'publish') {
      const check = current.checklist!;
      if (!check.canPublish) {
        throw unprocessable('CHECKLIST_INCOMPLETE', 'This scheme is missing required information and cannot be published yet.', {
          checklist: check,
        });
      }
      if (check.tbc.length && !opts.acknowledgeTbc) {
        throw unprocessable(
          'TBC_ACK_REQUIRED',
          'Some details are marked "To be confirmed". Confirm that you want to publish them with that label.',
          { checklist: check },
        );
      }
    }
    await db.query(
      `UPDATE schemes SET publication_status = $1::publication_status,
              published_at = CASE WHEN $1::text = 'published' THEN COALESCE(published_at, now()) ELSE published_at END,
              archived_at = CASE WHEN $1::text = 'archived' THEN now() WHEN $1::text = 'draft' THEN NULL ELSE archived_at END,
              updated_by = $2, updated_at = now(), version = version + 1
        WHERE id = $3`,
      [rule.to, actor.id, id],
    );
    await recordAudit(db, {
      entityType: 'scheme',
      entityId: id,
      action,
      actor,
      changes: { publicationStatus: { from: current.publicationStatus, to: rule.to } },
    });
    return getAdminScheme(db, id);
  });
}

export async function listVerifications(db: DbClient, schemeId: string): Promise<VerificationRecord[]> {
  const { rows } = await db.query(
    `SELECT v.id, v.source, v.source_url, v.verified_on, u.name AS verified_by, v.notes, v.created_at
       FROM scheme_verifications v LEFT JOIN admin_users u ON u.id = v.verified_by
      WHERE v.scheme_id = $1 ORDER BY v.created_at DESC, v.id DESC LIMIT 100`,
    [schemeId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    source: r.source,
    sourceUrl: r.source_url,
    verifiedOn: r.verified_on,
    verifiedBy: r.verified_by,
    notes: r.notes,
    createdAt: r.created_at.toISOString(),
  }));
}
