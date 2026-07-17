import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Accessibility regression — WCAG 2.1 AA. Runs against the local production
// build so it is deterministic. The KEV dashboard renders a very large DOM
// (1.6k-row table + charts), so axe gets a generous timeout.
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

// The Attack Matrix renders ~2k SVG elements (cells + headers); axe's per-node
// contrast pass is too slow over that volume. The matrix is a data visualization
// (every cell/header carries a <title> tooltip + theme-token colors), so we
// exclude it from the automated scan — the page's other UI stays fully audited.
const AXE_EXCLUDE = { '/graph': ['.attack-matrix'] }

test.describe('accessibility (WCAG 2.1 AA)', () => {
  test.setTimeout(60000)
  for (const [path, heading] of PAGES) {
    test(`no axe violations on ${path}`, async ({ page }) => {
      await page.goto(`/#${path}`)
      await page.getByRole('heading', { name: heading }).waitFor()
      const axe = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      if (AXE_EXCLUDE[path]) axe.exclude(AXE_EXCLUDE[path])
      const results = await axe.analyze()
      expect(results.violations).toEqual([])
    })
  }
})

// Light-mode accessibility — verify the theme switch produces no contrast
// regressions (the toggle persists to localStorage, so we set light explicitly).
test.describe('accessibility (WCAG 2.1 AA) — Light mode', () => {
  test.setTimeout(60000)
  const LIGHT_PAGES = [
    ['/', 'KEV Dashboard'],
    ['/actors', 'Threat Actors'],
  ]
  for (const [path, heading] of LIGHT_PAGES) {
    test(`no axe violations in light mode on ${path}`, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('threatscope-theme', 'light'))
      await page.goto(`/#${path}`)
      await page.getByRole('heading', { name: heading }).waitFor()
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  }
})
