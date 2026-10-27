/**
 * Usage:
 *   npm run db:seed                 reference data + demonstration records
 *   npm run db:seed -- --no-demo    reference data only (production)
 *   npm run db:seed -- --reset-demo delete and re-create demonstration records
 * Set ADMIN_EMAIL / ADMIN_PASSWORD to bootstrap the first super admin.
 */
import { userCreateSchema } from '@mandal/shared';
import { runMigrations } from '../db/migrate';
import { createPool } from '../db/pool';
import { bootstrapAdmin, seedDemo, seedReference } from '../db/seed';

const args = new Set(process.argv.slice(2));
const pool = createPool();
try {
  await runMigrations(pool);
  await seedReference(pool);
  console.log('Reference data (categories, departments, groups, geography, settings) ensured.');

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const check = userCreateSchema.safeParse({
      email: process.env.ADMIN_EMAIL,
      name: process.env.ADMIN_NAME || 'Portal Administrator',
      role: 'super_admin',
      password: process.env.ADMIN_PASSWORD,
    });
    if (!check.success) {
      console.error('ADMIN_EMAIL/ADMIN_PASSWORD invalid:', check.error.issues.map((i) => i.message).join('; '));
      process.exitCode = 1;
    } else {
      const created = await bootstrapAdmin(pool);
      console.log(created ? `Created super admin ${created}.` : 'Admin users already exist — bootstrap skipped.');
    }
  }

  if (!args.has('--no-demo')) {
    const r = await seedDemo(pool, { reset: args.has('--reset-demo') });
    console.log(`Demonstration data: ${r.schemes} scheme(s), ${r.notices} notice(s) added. (Labelled as demo.)`);
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
