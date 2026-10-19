import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', workers: 1, use: { baseURL: 'http://127.0.0.1:4174', channel: 'chrome' },
  webServer: { command: 'npm run dev -- --mode test --port 4174 --strictPort', url: 'http://127.0.0.1:4174', reuseExistingServer: false },
});
