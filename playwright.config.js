import { defineConfig, devices } from '@playwright/test'

// E2E runs against a LOCAL preview of the production build (spun up by the
// webServer below), not the live site. This makes CI deterministic — no
// dependency on Cloudflare Pages deploy propagation — while still exercising
// real navigation, a11y (axe), performance budgets, and Phase A features.
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  // The e2e suite hammers a single local `vite preview` server with very large
  // datasets (KEV ~1.6MB, actors ~50KB, the 2k-node Attack Matrix). Running the
  // heavy pages fully parallel starves the server and makes interaction clicks
  // time out intermittently. Serializing the workers keeps the runs deterministic
  // and removes the flaky 30s click timeouts.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    actionTimeout: 60000,
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
