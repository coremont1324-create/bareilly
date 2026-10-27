import { runMigrations } from '../db/migrate';
import { createPool } from '../db/pool';

const pool = createPool();
try {
  console.log('Running migrations…');
  const applied = await runMigrations(pool);
  console.log(applied.length ? `Applied ${applied.length} migration(s).` : 'Database is up to date.');
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
