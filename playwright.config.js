import { defineConfig, devices } from '@playwright/test'

// E2E runs against a LOCAL preview of the production build (spun up by the
// webServer below), not the live site. This makes CI deterministic — no
// dependency on Cloudflare Pages deploy propagation — while still exercising
// real navigation, a11y (axe), performance budgets, and Phase A features.
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 8000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
