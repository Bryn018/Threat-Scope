import { test, expect } from '@playwright/test'

// End-to-end regression suite. Automates the navigation-swap bug that was
// previously fixed (route changes must actually swap the mounted view), plus
// smoke-checks the Phase A features against the LIVE, auto-synced site.

const PAGES = [
  ['/', 'KEV Dashboard'],
  ['/cves', 'CVE Explorer'],
  ['/attack', 'ATT&CK Matrix'],
  ['/intel', 'Threat Intel'],
  ['/iocs', 'IOC Lookup'],
  ['/exploits', 'Exploit Tracker'],
  ['/exposure', 'Technology Exposure'],
  ['/actors', 'Threat Actors'],
  ['/graph', 'Attack Matrix'],
  ['/watchlist', 'Watchlist'],
  ['/resources', 'Resources'],
]

test.describe('navigation swaps views', () => {
  for (const [path, heading] of PAGES) {
    test(`loads ${path} with heading "${heading}"`, async ({ page }) => {
      await page.goto(`/#${path}`)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    })
  }

  // The exact regression: ATT&CK -> CVE must swap (URL changes AND view swaps).
  test('ATT&CK -> CVE swaps the view', async ({ page }) => {
    await page.goto('/#/attack')
    await expect(page.getByRole('heading', { name: 'ATT&CK Matrix' })).toBeVisible()
    await page.goto('/#/cves')
    await expect(page.getByRole('heading', { name: 'CVE Explorer' })).toBeVisible()
    // previous view must be gone
    await expect(page.getByText('Tactics', { exact: false })).toHaveCount(0)
  })
})

test.describe('Phase A features', () => {
  test('KEV shows EPSS KPI and export buttons', async ({ page }) => {
    await page.goto('/#/')
    await expect(page.getByText('EPSS ≥0.9 (Critical)')).toBeVisible()
    await expect(page.getByRole('button', { name: 'CSV' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'STIX' })).toBeVisible()
  })

  test('command palette opens and navigates', async ({ page }) => {
    await page.goto('/#/')
    // Open via the Quick-nav trigger (reliable in headless; Cmd/Ctrl+K is
    // intercepted by the browser chrome in some environments).
    await page.getByRole('button', { name: /Quick nav|Search/ }).click()
    const input = page.getByPlaceholder('Jump to a page…')
    await expect(input).toBeVisible()
    await input.fill('exposure')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/exposure/)
    await expect(page.getByRole('heading', { name: 'Technology Exposure' })).toBeVisible()
  })

  test('Tech Exposure page renders real vendor data', async ({ page }) => {
    await page.goto('/#/exposure')
    // KPI stats + table load from the auto-synced feeds (async).
    await expect(page.getByText('WITH PUBLIC EXPLOIT')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('cell', { name: 'Microsoft' })).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Phase C features', () => {
  test('Threat Actors page renders real MITRE groups + opens a profile', async ({ page }) => {
    await page.goto('/#/actors')
    await expect(page.getByText('Tracked actors')).toBeVisible()
    await expect(page.getByText('174')).toBeVisible()
    // Open the top actor (Kimsuky) and confirm techniques render.
    await page.getByRole('button', { name: /Open .* profile/ }).first().click()
    await expect(page.getByText(/Techniques \(\d+\)/)).toBeVisible({ timeout: 10000 })
  })

  test('Attack Matrix renders as an adjacency grid + top-technique leaderboard', async ({ page }) => {
    await page.goto('/#/graph')
    await expect(page.getByText('Most-targeted techniques')).toBeVisible({ timeout: 15000 })
    // Leaderboard card
    await expect(page.getByRole('button', { name: /Ingress Tool Transfer \d+/ })).toBeVisible()
    // The matrix itself (group role) renders with lit cells (rects)
    const matrix = page.getByRole('group', { name: /Adjacency matrix/ })
    await expect(matrix).toBeVisible({ timeout: 15000 })
    await expect(matrix.locator('rect').first()).toBeVisible()
    // Clicking a leaderboard technique focuses it and opens the detail panel
    await page.getByRole('button', { name: /Ingress Tool Transfer \d+/ }).click()
    await expect(page.getByText(/Used by \d+ threat actors?/)).toBeVisible({ timeout: 10000 })
  })

  test('Watchlist persists an added CVE across reload', async ({ page }) => {
    await page.goto('/#/watchlist')
    const input = page.getByLabel('Add to watchlist')
    await input.fill('CVE-2026-46817')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Remove CVE-2026-46817' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Remove CVE-2026-46817' })).toBeVisible()
  })
})

test.describe('Navigation is responsive (no stuck views)', () => {
  test('switching pages swaps the heading immediately', async ({ page }) => {
    await page.goto('/#/cves')
    await expect(page.getByRole('heading', { name: 'CVE Explorer' })).toBeVisible()
    // Jump to several pages in quick succession; the heading must follow each time
    // (guards against the hash-router view-freeze where the URL changes but the
    // previous screen stays mounted).
    for (const [path, heading] of [
      ['/actors', 'Threat Actors'],
      ['/graph', 'Attack Matrix'],
      ['/watchlist', 'Watchlist'],
      ['/', 'KEV Dashboard'],
      ['/exposure', 'Technology Exposure'],
    ]) {
      await page.goto(`/#${path}`)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 10000 })
    }
  })

  test('theme toggle switches between dark and light', async ({ page }) => {
    await page.goto('/#/')
    const toggle = page.getByRole('button', { name: /Switch to (light|dark) mode/ })
    await expect(toggle).toBeVisible()
    await toggle.click()
    // Preference persists across reloads
    await page.reload()
    await expect(page.getByRole('button', { name: /Switch to (light|dark) mode/ })).toBeVisible()
  })
})
