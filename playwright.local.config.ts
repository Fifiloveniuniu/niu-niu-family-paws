import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/local-browser',
  outputDir: './test-results-local',
  workers: 1,
  use: {
    headless: true,
    baseURL: 'http://localhost:4180',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
});
