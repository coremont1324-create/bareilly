import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import type pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, '../../.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

export const TEST_DB_URL = process.env.DATABASE_URL_TEST ?? '';
if (!TEST_DB_URL) throw new Error('DATABASE_URL_TEST must be set to run server tests (it will be wiped).');
process.env.DATABASE_URL = TEST_DB_URL;
process.env.NODE_ENV = 'test';
process.env.LOGIN_RATE_LIMIT = process.env.LOGIN_RATE_LIMIT ?? '50';

const { createPool } = await import('../src/db/pool');
const { runMigrations } = await import('../src/db/migrate');
const { seedReference, seedDemo } = await import('../src/db/seed');
const { createUser } = await import('../src/services/users');
const { createApp } = await import('../src/app');

export const SUPER = { email: 'super@test.local', password: 'Super-secret-123', name: 'Super Admin' };
export const EDITOR = { email: 'editor@test.local', password: 'Editor-secret-123', name: 'Editor One' };

export async function resetDatabase(): Promise<{ pool: pg.Pool; app: ReturnType<typeof createApp> }> {
  const pool = createPool(TEST_DB_URL);
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await runMigrations(pool, undefined, () => undefined);
  await seedReference(pool);
  await createUser(pool, { ...SUPER, role: 'super_admin' }, null);
  await createUser(pool, { ...EDITOR, role: 'editor' }, null);
  await seedDemo(pool);
  const app = createApp(pool, { serveClient: false });
  return { pool, app };
}

/** A supertest agent that keeps cookies and sends the CSRF header. */
export async function login(app: Parameters<typeof request.agent>[0], who: { email: string; password: string }) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').set('X-Requested-With', 'mandal-portal').send(who);
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export const H = { 'X-Requested-With': 'mandal-portal' };

export async function ids(pool: pg.Pool) {
  const one = async (sql: string) => (await pool.query(sql)).rows[0].id as number;
  return {
    agriculture: await one(`SELECT id FROM categories WHERE slug = 'agriculture'`),
    education: await one(`SELECT id FROM categories WHERE slug = 'education'`),
    dept: await one(`SELECT id FROM departments ORDER BY id LIMIT 1`),
    mandal: await one(`SELECT id FROM mandals WHERE slug = 'kallur'`),
    otherMandal: await one(`SELECT id FROM mandals WHERE slug = 'gudur'`),
    farmers: await one(`SELECT id FROM beneficiary_groups WHERE slug = 'farmers'`),
  };
}

export function completeScheme(i: Awaited<ReturnType<typeof ids>>, overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Drip Irrigation Subsidy',
    shortDescription: 'Subsidy support for drip irrigation equipment for small farmers.',
    categoryId: i.agriculture,
    departmentId: i.dept,
    eligibility: ['Farmers with own land'],
    benefits: ['Subsidy on equipment'],
    requiredDocuments: ['Aadhaar'],
    applicationSteps: ['Apply on the official portal'],
    applicationStatus: 'open',
    deadline: '2099-12-31',
    officialUrl: 'https://agriwelfare.gov.in/',
    applicationUrl: 'https://agriwelfare.gov.in/apply',
    helpNotes: 'Contact the mandal agriculture office',
    availableAllMandals: false,
    mandalIds: [i.mandal],
    beneficiaryGroupIds: [i.farmers],
    verificationSource: 'Test official notification',
    lastVerifiedOn: '2026-01-15',
    isDemo: true,
    ...overrides,
  };
}
