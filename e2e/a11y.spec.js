import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Accessibility regression — WCAG 2.1 AA. Runs against the live, auto-synced
// site so it always reflects what users actually get.
const PAGES = ['/', '/cves', '/attack', '/intel', '/iocs', '/exploits', '/exposure', '/resources']

test.describe('accessibility (WCAG 2.1 AA)', () => {
  for (const path of PAGES) {
    test(`no axe violations on ${path}`, async ({ page }) => {
      await page.goto(`/#${path}`)
      await page.waitForLoadState('networkidle')
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  }
})
