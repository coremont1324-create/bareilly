/**
 * Create an administrator account.
 *   npm run admin:create -- --email admin@example.org --name "Asha Rao" [--role super_admin|editor]
 * The password is read from ADMIN_PASSWORD, or prompted for (hidden) when running in a terminal.
 */
import readline from 'node:readline';
import { userCreateSchema } from '@mandal/shared';
import { runMigrations } from '../db/migrate';
import { createPool } from '../db/pool';
import { createUser } from '../services/users';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function promptHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) throw new Error('Set ADMIN_PASSWORD or run in an interactive terminal.');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
    if (s.includes(question)) write.call(rl, s);
  };
  const answer = await new Promise<string>((resolve) => rl.question(question, resolve));
  rl.close();
  process.stdout.write('\n');
  return answer;
}

const pool = createPool();
try {
  await runMigrations(pool, undefined, () => undefined);
  const password = process.env.ADMIN_PASSWORD || (await promptHidden('Password (min 12 chars, letters + numbers): '));
  const input = userCreateSchema.parse({
    email: arg('email') ?? process.env.ADMIN_EMAIL,
    name: arg('name') ?? process.env.ADMIN_NAME ?? 'Portal Administrator',
    role: arg('role') ?? 'super_admin',
    password,
  });
  const user = await createUser(pool, input, null);
  console.log(`Created ${user.role} ${user.email}`);
} catch (err) {
  const e = err as { issues?: { path: string[]; message: string }[]; message: string };
  console.error(e.issues ? e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n') : e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
