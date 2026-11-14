import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '*.spec.ts',
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone-portrait', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'iphone-landscape', use: { ...devices['iPhone 13 landscape'], browserName: 'chromium' } }
  ],
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI }
});
