import {
  addDays,
  todayIST,
  UPCOMING_DEADLINE_DAYS,
  DEFAULT_REVIEW_INTERVAL_DAYS,
  type DashboardMetrics,
  type MandalOffice,
  type MetaResponse,
  type OfficeInput,
} from '@mandal/shared';
import type { DbClient } from '../db/pool';
import { notFound } from '../lib/errors';
import { listAudit, recordAudit, type Actor } from './audit';
import { getSettings, publicHelpdesk } from './settings';

export async function getMeta(db: DbClient): Promise<MetaResponse> {
  const [cats, depts, groups, mandals, settings] = await Promise.all([
    db.query(
      `SELECT c.id, c.slug, c.name, c.icon, c.color,
              (SELECT count(*)::int FROM schemes s WHERE s.category_id = c.id AND s.publication_status = 'published') AS count
         FROM categories c ORDER BY c.sort_order, c.name`,
    ),
    db.query('SELECT id, name, level FROM departments ORDER BY name'),
    db.query('SELECT id, slug, name FROM beneficiary_groups ORDER BY name'),
    db.query(
      `SELECT m.id, m.slug, m.name, d.name AS district, st.name AS state
         FROM mandals m JOIN districts d ON d.id = m.district_id JOIN states st ON st.id = d.state_id
        ORDER BY st.name, d.name, m.name`,
    ),
    getSettings(db),
  ]);
  return {
    categories: cats.rows,
    departments: depts.rows,
    beneficiaryGroups: groups.rows,
    mandals: mandals.rows,
    defaultMandalSlug: settings.defaultMandalSlug ?? mandals.rows[0]?.slug ?? null,
    helpdesk: publicHelpdesk(settings.helpdesk),
  };
}

export async function getDashboard(db: DbClient, today = todayIST()): Promise<DashboardMetrics> {
  const horizon = addDays(today, UPCOMING_DEADLINE_DAYS);
  const awaitingSql = `s.publication_status <> 'archived' AND (
       s.last_verified_on IS NULL
       OR COALESCE(s.review_due_on, s.last_verified_on + ${DEFAULT_REVIEW_INTERVAL_DAYS}) < $1::date
       OR cardinality(s.tbc_fields) > 0)`;
  const [totals, upcoming, awaiting, notices, activity] = await Promise.all([
    db.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE publication_status = 'published')::int AS published,
              count(*) FILTER (WHERE publication_status = 'draft')::int AS draft,
              count(*) FILTER (WHERE publication_status = 'archived')::int AS archived,
              count(*) FILTER (WHERE publication_status = 'published' AND deadline BETWEEN $1::date AND $2::date)::int AS upcoming,
              count(*) FILTER (WHERE ${awaitingSql})::int AS awaiting
         FROM schemes s`,
      [today, horizon],
    ),
    db.query(
      `SELECT id, name, deadline FROM schemes WHERE publication_status = 'published' AND deadline BETWEEN $1::date AND $2::date
        ORDER BY deadline ASC LIMIT 10`,
      [today, horizon],
    ),
    db.query(
      `SELECT s.id, s.name, s.publication_status,
              CASE WHEN s.last_verified_on IS NULL THEN 'Never verified'
                   WHEN COALESCE(s.review_due_on, s.last_verified_on + ${DEFAULT_REVIEW_INTERVAL_DAYS}) < $1::date THEN 'Review overdue'
                   ELSE cardinality(s.tbc_fields) || ' detail(s) to be confirmed' END AS reason
         FROM schemes s WHERE ${awaitingSql}
        ORDER BY s.publication_status = 'published' DESC, s.updated_at DESC LIMIT 10`,
      [today],
    ),
    db.query(`SELECT count(*)::int AS n FROM notices WHERE publication_status = 'published'`),
    listAudit(db, { limit: 8 }),
  ]);
  const t = totals.rows[0];
  return {
    totals: {
      total: t.total,
      published: t.published,
      draft: t.draft,
      archived: t.archived,
      upcomingDeadlines: t.upcoming,
      awaitingVerification: t.awaiting,
      publishedNotices: notices.rows[0].n,
    },
    upcoming: upcoming.rows,
    awaiting: awaiting.rows.map((r) => ({ id: r.id, name: r.name, reason: r.reason, publicationStatus: r.publication_status })),
    recentActivity: activity,
  };
}

// ------------------------------------------------------------------ mandal offices

function toOffice(r: Record<string, any>): MandalOffice {
  return {
    mandalId: r.mandal_id,
    mandalName: r.mandal_name,
    officeName: r.office_name ?? '',
    address: r.address ?? '',
    phone: r.phone ?? null,
    email: r.email ?? null,
    hours: r.hours ?? '',
    isVerified: r.is_verified ?? false,
    source: r.source ?? '',
    updatedAt: r.updated_at ? r.updated_at.toISOString() : null,
  };
}

/** Public: only verified office contacts are returned. */
export async function getPublicOffice(db: DbClient, mandalSlug: string): Promise<MandalOffice | null> {
  const { rows } = await db.query(
    `SELECT o.*, m.name AS mandal_name FROM mandal_offices o JOIN mandals m ON m.id = o.mandal_id
      WHERE m.slug = $1 AND o.is_verified`,
    [mandalSlug],
  );
  return rows[0] ? toOffice(rows[0]) : null;
}

export async function listOffices(db: DbClient): Promise<MandalOffice[]> {
  const { rows } = await db.query(
    `SELECT m.id AS mandal_id, m.name AS mandal_name, o.office_name, o.address, o.phone, o.email, o.hours,
            o.is_verified, o.source, o.updated_at
       FROM mandals m LEFT JOIN mandal_offices o ON o.mandal_id = m.id ORDER BY m.name`,
  );
  return rows.map(toOffice);
}

export async function saveOffice(db: DbClient, mandalId: number, input: OfficeInput, actor: Actor): Promise<MandalOffice> {
  const m = await db.query('SELECT id FROM mandals WHERE id = $1', [mandalId]);
  if (!m.rowCount) throw notFound('Mandal not found');
  await db.query(
    `INSERT INTO mandal_offices (mandal_id, office_name, address, phone, email, hours, is_verified, verified_on, source, updated_by, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, CASE WHEN $7 THEN (now() AT TIME ZONE 'Asia/Kolkata')::date END, $8, $9, now())
     ON CONFLICT (mandal_id) DO UPDATE SET office_name=EXCLUDED.office_name, address=EXCLUDED.address, phone=EXCLUDED.phone,
       email=EXCLUDED.email, hours=EXCLUDED.hours, is_verified=EXCLUDED.is_verified,
       verified_on = CASE WHEN EXCLUDED.is_verified THEN COALESCE(mandal_offices.verified_on, EXCLUDED.verified_on) END,
       source=EXCLUDED.source, updated_by=EXCLUDED.updated_by, updated_at=now()`,
    [mandalId, input.officeName, input.address, input.phone, input.email, input.hours, input.isVerified, input.source, actor.id],
  );
  await recordAudit(db, { entityType: 'office', entityId: String(mandalId), action: 'update', actor, changes: { ...input } });
  const { rows } = await db.query(
    `SELECT o.*, m.name AS mandal_name FROM mandal_offices o JOIN mandals m ON m.id = o.mandal_id WHERE o.mandal_id = $1`,
    [mandalId],
  );
  return toOffice(rows[0]);
}
