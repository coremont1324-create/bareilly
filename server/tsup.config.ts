import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'scripts/migrate': 'src/scripts/migrate.ts',
    'scripts/seed': 'src/scripts/seed.ts',
    'scripts/createAdmin': 'src/scripts/createAdmin.ts',
  },
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Bundle the shared workspace (TypeScript source) into the server output.
  noExternal: ['@mandal/shared'],
  publicDir: false,
  onSuccess: 'mkdir -p dist/db/migrations && cp src/db/migrations/*.sql dist/db/migrations/',
});
