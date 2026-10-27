import pg from 'pg';
import { config, requireDatabaseUrl } from '../config';

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Dates (avoids timezone drift).
pg.types.setTypeParser(1082, (v: string) => v);
// bigint counts -> number (safe for the sizes this app handles)
pg.types.setTypeParser(20, (v: string) => Number(v));

export type Db = pg.Pool;
export type DbClient = pg.PoolClient | pg.Pool;

export function createPool(connectionString: string = requireDatabaseUrl()): pg.Pool {
  return new pg.Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    ssl: config.databaseSsl ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
  });
}

export async function withTransaction<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
