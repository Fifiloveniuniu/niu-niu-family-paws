import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/backend-browser',
  workers: 1,
  use: {
    headless: true,
    baseURL: 'http://localhost:4184',
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        'FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node --experimental-strip-types tests/helpers/workspace-server.mjs',
      url: 'http://127.0.0.1:8092/__test-fixture',
      reuseExistingServer: false,
    },
    {
      command:
        'npx vite --mode test --config tests/helpers/workspace-vite.config.ts --port 4184 --strictPort',
      url: 'http://localhost:4184',
      reuseExistingServer: false,
    },
  ],
});
