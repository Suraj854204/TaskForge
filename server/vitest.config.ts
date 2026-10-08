import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    hookTimeout: 120000,
    testTimeout: 30000,
    env: { NODE_ENV: 'test', JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '1d' },
  },
});
