import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/globalSetup.ts'],
    // Tests share one database; run files sequentially to keep state predictable.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
