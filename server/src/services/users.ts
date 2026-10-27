import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { AdminRole, AdminUser } from '@mandal/shared';
import type { DbClient } from '../db/pool';
import { config } from '../config';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { diff, recordAudit, type Actor } from './audit';

const BCRYPT_COST = 12;
// A real bcrypt hash used to keep login timing constant when the email is unknown.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-placeholder', 10);

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

function toUser(r: Record<string, any>): AdminUser {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    isActive: r.is_active,
    lastLoginAt: r.last_login_at ? r.last_login_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
  };
}

export async function verifyCredentials(db: DbClient, email: string, password: string): Promise<AdminUser | null> {
  const { rows } = await db.query('SELECT * FROM admin_users WHERE lower(email) = lower($1)', [email]);
  const row = rows[0];
  const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !ok || !row.is_active) return null;
  return toUser(row);
}

export async function createSession(db: DbClient, userId: string, meta: { ip?: string; userAgent?: string }): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3600 * 1000);
  await db.query(`INSERT INTO sessions (id, user_id, expires_at, ip, user_agent) VALUES ($1, $2, $3, $4, $5)`, [
    hashToken(token),
    userId,
    expiresAt,
    meta.ip ?? null,
    (meta.userAgent ?? '').slice(0, 300),
  ]);
  await db.query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [userId]);
  // Opportunistic cleanup of expired sessions.
  await db.query('DELETE FROM sessions WHERE expires_at < now()');
  return { token, expiresAt };
}

export async function getSessionUser(db: DbClient, token: string): Promise<Actor | null> {
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN admin_users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > now() AND u.is_active`,
    [hashToken(token)],
  );
  return (rows[0] as Actor) ?? null;
}

export async function destroySession(db: DbClient, token: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE id = $1', [hashToken(token)]);
}

export async function listUsers(db: DbClient): Promise<AdminUser[]> {
  const { rows } = await db.query('SELECT * FROM admin_users ORDER BY created_at ASC');
  return rows.map(toUser);
}

export async function createUser(
  db: DbClient,
  input: { email: string; name: string; role: AdminRole; password: string },
  actor: Actor | null,
): Promise<AdminUser> {
  const existing = await db.query('SELECT 1 FROM admin_users WHERE lower(email) = lower($1)', [input.email]);
  if (existing.rowCount) throw conflict('An account with this email already exists');
  const { rows } = await db.query(
    `INSERT INTO admin_users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.email.toLowerCase(), input.name, input.role, await hashPassword(input.password)],
  );
  await recordAudit(db, {
    entityType: 'user',
    entityId: rows[0].id,
    action: 'create',
    actor,
    changes: { email: input.email, role: input.role },
  });
  return toUser(rows[0]);
}

export async function updateUser(
  db: DbClient,
  id: string,
  input: { name?: string; role?: AdminRole; isActive?: boolean; password?: string },
  actor: Actor,
): Promise<AdminUser> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('User not found');
  if (actor.role !== 'super_admin') throw forbidden();
  const { rows } = await db.query('SELECT * FROM admin_users WHERE id = $1', [id]);
  const user = rows[0];
  if (!user) throw notFound('User not found');
  if (id === actor.id && (input.role && input.role !== user.role)) throw badRequest('You cannot change your own role');
  if (id === actor.id && input.isActive === false) throw badRequest('You cannot deactivate your own account');
  if (user.role === 'super_admin' && (input.role === 'editor' || input.isActive === false)) {
    const { rows: admins } = await db.query(
      `SELECT count(*)::int AS n FROM admin_users WHERE role = 'super_admin' AND is_active AND id <> $1`,
      [id],
    );
    if (admins[0].n === 0) throw badRequest('At least one active super administrator is required');
  }
  const next = {
    name: input.name ?? user.name,
    role: input.role ?? user.role,
    is_active: input.isActive ?? user.is_active,
  };
  const passwordHash = input.password ? await hashPassword(input.password) : user.password_hash;
  const { rows: updated } = await db.query(
    `UPDATE admin_users SET name=$1, role=$2, is_active=$3, password_hash=$4, updated_at=now() WHERE id=$5 RETURNING *`,
    [next.name, next.role, next.is_active, passwordHash, id],
  );
  if (!next.is_active || input.password) await db.query('DELETE FROM sessions WHERE user_id = $1', [id]);
  const changes: Record<string, unknown> = diff({ name: user.name, role: user.role, isActive: user.is_active }, {
    name: next.name,
    role: next.role,
    isActive: next.is_active,
  });
  if (input.password) changes.password = 'reset';
  await recordAudit(db, { entityType: 'user', entityId: id, action: 'update', actor, changes });
  return toUser(updated[0]);
}
