import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default function setup() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const envFile = path.resolve(here, '../../.env');
  if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);
  if (!process.env.DATABASE_URL_TEST) {
    throw new Error('Set DATABASE_URL_TEST (a disposable database) before running server tests.');
  }
  if (process.env.DATABASE_URL_TEST === process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL_TEST must differ from DATABASE_URL — the test suite wipes it.');
  }
}
