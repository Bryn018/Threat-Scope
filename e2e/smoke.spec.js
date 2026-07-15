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
  ['/resources', 'Resources'],
]

test.describe('navigation swaps views', () => {
  for (const [path, heading] of PAGES) {
    test(`loads ${path} with heading "${heading}"`, async ({ page }) => {
      await page.goto(`/#${path}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
    })
  }

  // The exact regression: ATT&CK -> CVE must swap (URL changes AND view swaps).
  test('ATT&CK -> CVE swaps the view', async ({ page }) => {
    await page.goto('/#/attack')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ATT&CK Matrix')
    await page.goto('/#/cves')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('CVE Explorer')
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

  test('command palette opens on Cmd/Ctrl+K and navigates', async ({ page }) => {
    await page.goto('/#/')
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder('Jump to a page or run a command…')
    await expect(input).toBeVisible()
    await input.fill('exposure')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/exposure/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Technology Exposure')
  })

  test('Tech Exposure page renders real vendor data', async ({ page }) => {
    await page.goto('/#/exposure')
    await expect(page.getByText('WITH PUBLIC EXPLOIT')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Microsoft' })).toBeVisible()
  })
})
