import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 90000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', browserName: 'chromium', channel: 'msedge', headless: true, screenshot: 'only-on-failure' },
  webServer: { command: 'node server.mjs', url: 'http://localhost:4173', reuseExistingServer: true }
});
