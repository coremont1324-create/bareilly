import { schemeInputSchema, slugify } from '@mandal/shared';
import type pg from 'pg';
import { createNotice, transitionNotice } from '../services/notices';
import { createScheme, transitionScheme } from '../services/schemes';
import { DEFAULT_SETTINGS } from '../services/settings';
import type { Actor } from '../services/audit';
import { createUser } from '../services/users';
import { BENEFICIARY_GROUPS, CATEGORIES, DEFAULT_MANDAL, DEMO_NOTICES, DEMO_SCHEMES, DEPARTMENTS, GEOGRAPHY } from './seedData';

/** Idempotent: inserts reference data that does not exist yet. */
export async function seedReference(pool: pg.Pool): Promise<void> {
  for (const c of CATEGORIES) {
    await pool.query(
      `INSERT INTO categories (slug, name, icon, color, sort_order) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING`,
      [c.slug, c.name, c.icon, c.color, c.sort],
    );
  }
  for (const d of DEPARTMENTS) {
    await pool.query(`INSERT INTO departments (name, level) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING`, [d.name, d.level]);
  }
  for (const g of BENEFICIARY_GROUPS) {
    await pool.query(`INSERT INTO beneficiary_groups (slug, name) VALUES ($1,$2) ON CONFLICT (slug) DO NOTHING`, [g.slug, g.name]);
  }
  for (const s of GEOGRAPHY) {
    const st = await pool.query(
      `INSERT INTO states (name, code) VALUES ($1,$2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [s.state.name, s.state.code],
    );
    for (const d of s.districts) {
      const dr = await pool.query(
        `INSERT INTO districts (state_id, name) VALUES ($1,$2) ON CONFLICT (state_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [st.rows[0].id, d.name],
      );
      for (const m of d.mandals) {
        await pool.query(`INSERT INTO mandals (district_id, name, slug) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [
          dr.rows[0].id,
          m,
          slugify(m),
        ]);
      }
    }
  }
  const defaults: Record<string, unknown> = { ...DEFAULT_SETTINGS, defaultMandalSlug: DEFAULT_MANDAL };
  for (const [key, value] of Object.entries(defaults)) {
    await pool.query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [key, JSON.stringify(value)]);
  }
}

const SEED_ACTOR: Actor = { id: '', email: 'seed@localhost', name: 'Seed script', role: 'super_admin' };

/** Inserts demonstration schemes/notices that are not present yet (matched by name). */
export async function seedDemo(pool: pg.Pool, opts: { reset?: boolean } = {}): Promise<{ schemes: number; notices: number }> {
  if (opts.reset) {
    await pool.query('DELETE FROM notices WHERE is_demo');
    await pool.query('DELETE FROM schemes WHERE is_demo');
  }
  const ids = async (table: string, col: string) =>
    Object.fromEntries((await pool.query(`SELECT id, ${col} AS k FROM ${table}`)).rows.map((r) => [r.k, r.id]));
  const cats = await ids('categories', 'slug');
  const depts = await ids('departments', 'name');
  const groups = await ids('beneficiary_groups', 'slug');

  let schemes = 0;
  const schemeIds: Record<string, string> = {};
  for (const demo of DEMO_SCHEMES) {
    const existing = await pool.query('SELECT id FROM schemes WHERE name = $1', [demo.name]);
    if (existing.rowCount) {
      schemeIds[demo.name] = existing.rows[0].id;
      continue;
    }
    const { categorySlug, department, groups: g, publish, ...rest } = demo;
    const input = schemeInputSchema.parse({
      ...rest,
      categoryId: cats[categorySlug] ?? null,
      departmentId: depts[department] ?? null,
      beneficiaryGroupIds: g.map((s) => groups[s]).filter(Boolean),
    });
    const created = await createScheme(pool, input, null);
    schemeIds[demo.name] = created.id;
    if (publish) {
      await transitionScheme(pool, created.id, 'publish', { version: created.version, acknowledgeTbc: true }, await seedActor(pool));
    }
    schemes++;
  }

  let notices = 0;
  for (const n of DEMO_NOTICES) {
    const existing = await pool.query('SELECT 1 FROM notices WHERE title = $1', [n.title]);
    if (existing.rowCount) continue;
    const created = await createNotice(
      pool,
      {
        title: n.title,
        summary: n.summary,
        publishedOn: n.publishedOn,
        deadline: null,
        schemeId: schemeIds[n.schemeName] ?? null,
        officialUrl: n.officialUrl,
        isDemo: true,
      },
      null,
    );
    if (n.publish) await transitionNotice(pool, created.id, 'publish', created.version, await seedActor(pool));
    notices++;
  }
  return { schemes, notices };
}

/** Transitions need an actor row for updated_by; use the first super admin or a NULL-safe stand-in. */
async function seedActor(pool: pg.Pool): Promise<Actor> {
  const { rows } = await pool.query(`SELECT id, email, name, role FROM admin_users WHERE role = 'super_admin' ORDER BY created_at LIMIT 1`);
  return (rows[0] as Actor) ?? ({ ...SEED_ACTOR, id: null } as unknown as Actor);
}

/** Create the first super admin from ADMIN_EMAIL / ADMIN_PASSWORD when no admin exists yet. */
export async function bootstrapAdmin(pool: pg.Pool, env = process.env): Promise<string | null> {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM admin_users');
  if (rows[0].n > 0) return null;
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return null;
  const user = await createUser(
    pool,
    { email: env.ADMIN_EMAIL, name: env.ADMIN_NAME || 'Portal Administrator', role: 'super_admin', password: env.ADMIN_PASSWORD },
    null,
  );
  return user.email;
}
