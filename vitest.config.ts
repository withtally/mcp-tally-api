import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 60000, // 60 seconds for live API calls
    hookTimeout: 60000, // 60 seconds for setup/teardown
    reporters: ['verbose'],
    env: {
      NODE_ENV: 'test',
    },
    setupFiles: ['./tests/setup.ts'],
  },
  esbuild: {
    target: 'node18',
  },
});
