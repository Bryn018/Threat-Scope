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
  ['/resources', 'Resources'],
]

test.describe('accessibility (WCAG 2.1 AA)', () => {
  test.setTimeout(60000)
  for (const [path, heading] of PAGES) {
    test(`no axe violations on ${path}`, async ({ page }) => {
      await page.goto(`/#${path}`)
      await page.getByRole('heading', { name: heading }).waitFor()
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  }
})
