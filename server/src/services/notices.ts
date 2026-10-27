import { checkOfficialLink, type AdminNotice, type NoticeInput, type NoticeSummary, type Paginated, type PublicationStatus } from '@mandal/shared';
import type pg from 'pg';
import { withTransaction, type DbClient } from '../db/pool';
import { conflict, notFound, unprocessable } from '../lib/errors';
import { diff, recordAudit, type Actor } from './audit';
import { getOfficialDomains } from './settings';

type Row = Record<string, any>;

function toPublic(r: Row, domains: string[]): NoticeSummary {
  const link = checkOfficialLink(r.official_url, domains);
  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    publishedOn: r.published_on,
    deadline: r.deadline,
    officialLink: link.ok ? { url: link.url, host: link.host } : null,
    // Only link to schemes citizens can actually open.
    scheme: r.scheme_slug && r.scheme_pub === 'published' ? { slug: r.scheme_slug, name: r.scheme_name } : null,
    isDemo: r.is_demo,
  };
}

function toAdmin(r: Row): AdminNotice {
  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    publishedOn: r.published_on,
    deadline: r.deadline,
    schemeId: r.scheme_id,
    schemeName: r.scheme_name ?? null,
    officialUrl: r.official_url,
    isDemo: r.is_demo,
    publicationStatus: r.publication_status,
    version: r.version,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    createdBy: r.created_by_name ?? null,
    updatedBy: r.updated_by_name ?? null,
  };
}

const SELECT = `
  SELECT n.*, s.slug AS scheme_slug, s.name AS scheme_name, s.publication_status AS scheme_pub,
         cu.name AS created_by_name, uu.name AS updated_by_name
    FROM notices n
    LEFT JOIN schemes s ON s.id = n.scheme_id
    LEFT JOIN admin_users cu ON cu.id = n.created_by
    LEFT JOIN admin_users uu ON uu.id = n.updated_by`;

export async function listPublicNotices(
  db: DbClient,
  opts: { schemeId?: string; limit?: number; page?: number },
): Promise<Paginated<NoticeSummary>> {
  const domains = await getOfficialDomains(db);
  const pageSize = Math.min(opts.limit ?? 10, 50);
  const page = Math.max(1, opts.page ?? 1);
  const params: unknown[] = [];
  const where = [`n.publication_status = 'published'`, `n.published_on <= (now() AT TIME ZONE 'Asia/Kolkata')::date`];
  if (opts.schemeId) {
    params.push(opts.schemeId);
    where.push(`n.scheme_id = $${params.length}`);
  }
  const whereSql = where.join(' AND ');
  const [list, count] = await Promise.all([
    db.query(`${SELECT} WHERE ${whereSql} ORDER BY n.published_on DESC, n.created_at DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, params),
    db.query(`SELECT count(*)::int AS n FROM notices n WHERE ${whereSql}`, params),
  ]);
  const total = count.rows[0].n;
  return { items: list.rows.map((r) => toPublic(r, domains)), page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listAdminNotices(db: DbClient, opts: { status?: string }): Promise<AdminNotice[]> {
  const params: unknown[] = [];
  let where = '';
  if (opts.status && ['draft', 'published', 'archived'].includes(opts.status)) {
    params.push(opts.status);
    where = `WHERE n.publication_status = $1`;
  }
  const { rows } = await db.query(`${SELECT} ${where} ORDER BY n.updated_at DESC LIMIT 500`, params);
  return rows.map(toAdmin);
}

export async function getAdminNotice(db: DbClient, id: string, forUpdate = false): Promise<AdminNotice> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('Notice not found');
  if (forUpdate) await db.query('SELECT id FROM notices WHERE id = $1 FOR UPDATE', [id]);
  const { rows } = await db.query(`${SELECT} WHERE n.id = $1`, [id]);
  if (!rows[0]) throw notFound('Notice not found');
  return toAdmin(rows[0]);
}

async function validateLink(db: DbClient, input: NoticeInput) {
  if (input.officialUrl) {
    const c = checkOfficialLink(input.officialUrl, await getOfficialDomains(db));
    if (!c.ok) {
      throw unprocessable('INVALID_LINK', 'Notice links must be HTTPS links on an approved official domain.', {
        fields: { officialUrl: 'Use an HTTPS link on an approved official domain' },
      });
    }
  }
}

export async function createNotice(pool: pg.Pool, input: NoticeInput, actor: Actor | null): Promise<AdminNotice> {
  return withTransaction(pool, async (db) => {
    await validateLink(db, input);
    const { rows } = await db.query(
      `INSERT INTO notices (title, summary, published_on, deadline, scheme_id, official_url, is_demo, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING id`,
      [input.title, input.summary, input.publishedOn, input.deadline, input.schemeId, input.officialUrl, input.isDemo, actor?.id ?? null],
    );
    await recordAudit(db, { entityType: 'notice', entityId: rows[0].id, action: 'create', actor, changes: { title: input.title } });
    return getAdminNotice(db, rows[0].id);
  });
}

export async function updateNotice(pool: pg.Pool, id: string, input: NoticeInput, version: number, actor: Actor): Promise<AdminNotice> {
  return withTransaction(pool, async (db) => {
    const current = await getAdminNotice(db, id, true);
    if (current.version !== version) throw conflict('This notice was changed by someone else. Reload and try again.');
    await validateLink(db, input);
    const before = {
      title: current.title,
      summary: current.summary,
      publishedOn: current.publishedOn,
      deadline: current.deadline,
      schemeId: current.schemeId,
      officialUrl: current.officialUrl,
      isDemo: current.isDemo,
    };
    const changes = diff(before, input as unknown as Record<string, unknown>);
    if (!Object.keys(changes).length) return current;
    await db.query(
      `UPDATE notices SET title=$1, summary=$2, published_on=$3, deadline=$4, scheme_id=$5, official_url=$6, is_demo=$7,
              updated_by=$8, updated_at=now(), version=version+1 WHERE id=$9`,
      [input.title, input.summary, input.publishedOn, input.deadline, input.schemeId, input.officialUrl, input.isDemo, actor.id, id],
    );
    await recordAudit(db, { entityType: 'notice', entityId: id, action: 'update', actor, changes });
    return getAdminNotice(db, id);
  });
}

const NOTICE_TRANSITIONS: Record<string, { from: PublicationStatus[]; to: PublicationStatus }> = {
  publish: { from: ['draft'], to: 'published' },
  unpublish: { from: ['published'], to: 'draft' },
  archive: { from: ['draft', 'published'], to: 'archived' },
  restore: { from: ['archived'], to: 'draft' },
};

export async function transitionNotice(
  pool: pg.Pool,
  id: string,
  action: keyof typeof NOTICE_TRANSITIONS,
  version: number,
  actor: Actor,
): Promise<AdminNotice> {
  return withTransaction(pool, async (db) => {
    const current = await getAdminNotice(db, id, true);
    if (current.version !== version) throw conflict('This notice was changed by someone else. Reload and try again.');
    const rule = NOTICE_TRANSITIONS[action];
    if (!rule || !rule.from.includes(current.publicationStatus)) {
      throw conflict(`Cannot ${action} a notice that is ${current.publicationStatus}.`);
    }
    if (action === 'publish' && current.summary.trim().length < 10) {
      throw unprocessable('NOTICE_INCOMPLETE', 'Add a summary of at least 10 characters before publishing.', {
        fields: { summary: 'At least 10 characters' },
      });
    }
    await db.query(
      `UPDATE notices SET publication_status = $1, updated_by = $2, updated_at = now(), version = version + 1 WHERE id = $3`,
      [rule.to, actor.id, id],
    );
    await recordAudit(db, {
      entityType: 'notice',
      entityId: id,
      action,
      actor,
      changes: { publicationStatus: { from: current.publicationStatus, to: rule.to } },
    });
    return getAdminNotice(db, id);
  });
}
