import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

function firstExisting(candidates: string[]): string {
  return candidates.find((c) => fs.existsSync(c)) ?? candidates[0];
}

const nodeEnv =process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

export const config = {
  nodeEnv,
  isProduction,
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  databaseSsl: bool(process.env.DATABASE_SSL, false),
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 8),
  cookieSecure: bool(process.env.COOKIE_SECURE, isProduction),
  trustProxy: bool(process.env.TRUST_PROXY, isProduction),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
  /** Extra origins allowed to send state-changing requests (comma separated). */
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  clientDist:
    process.env.CLIENT_DIST ??
    firstExisting([path.resolve(here, '../../client/dist'), path.resolve(here, '../../../client/dist'), path.resolve(process.cwd(), 'client/dist'), path.resolve(process.cwd(), '../client/dist')]),
  migrationsDir:
    process.env.MIGRATIONS_DIR ??
    firstExisting([
      path.resolve(here, 'db/migrations'),
      path.resolve(here, '../db/migrations'),
      path.resolve(process.cwd(), 'src/db/migrations'),
      path.resolve(process.cwd(), 'server/src/db/migrations'),
    ]),
  loginRateLimit: Number(process.env.LOGIN_RATE_LIMIT ?? 10),
};

export function requireDatabaseUrl(): string {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and configure it.');
  }
  return config.databaseUrl;
}
