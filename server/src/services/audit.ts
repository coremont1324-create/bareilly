import type { AuditEntry } from '@mandal/shared';
import type { DbClient } from '../db/pool';

export interface Actor {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'editor';
}

export async function recordAudit(
  db: DbClient,
  entry: { entityType: string; entityId: string; action: string; actor: Actor | null; changes?: Record<string, unknown> | null },
): Promise<void> {
  await db.query(
    `INSERT INTO audit_log (entity_type, entity_id, action, actor_id, actor_email, changes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [entry.entityType, entry.entityId, entry.action, entry.actor?.id ?? null, entry.actor?.email ?? null, entry.changes ?? null],
  );
}

/** Shallow diff of two plain objects, returning {field: {from, to}} for changed keys. */
export function diff(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    const a = before[key];
    const b = after[key];
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) out[key] = { from: a ?? null, to: b ?? null };
  }
  return out;
}

export async function listAudit(
  db: DbClient,
  opts: { entityType?: string; entityId?: string; limit?: number },
): Promise<AuditEntry[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.entityType) {
    params.push(opts.entityType);
    where.push(`a.entity_type = $${params.length}`);
  }
  if (opts.entityId) {
    params.push(opts.entityId);
    where.push(`a.entity_id = $${params.length}`);
  }
  params.push(Math.min(opts.limit ?? 50, 200));
  const { rows } = await db.query(
    `SELECT a.id, a.entity_type, a.entity_id, a.action, a.actor_email, u.name AS actor_name, a.changes, a.created_at
       FROM audit_log a LEFT JOIN admin_users u ON u.id = a.actor_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT $${params.length}`,
    params,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    entityType: r.entity_type,
    entityId: r.entity_id,
    action: r.action,
    actorName: r.actor_name,
    actorEmail: r.actor_email,
    changes: r.changes,
    createdAt: r.created_at.toISOString(),
  }));
}
