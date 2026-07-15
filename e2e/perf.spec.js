import { test, expect } from '@playwright/test'

// Performance budget. Guards against regressions in bundle weight / load time
// on the live site. Budgets are conservative for a threat-intel SPA.
test.describe('performance budget', () => {
  test('KEV dashboard loads under budget', async ({ page }) => {
    const start = Date.now()
    await page.goto('/#/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'KEV Dashboard' }).waitFor()
    const ttfb = Date.now() - start
    expect(ttfb).toBeLessThan(8000) // generous for cold edge cache

    // Largest Contentful Paint budget
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          resolve(entries[entries.length - 1].startTime)
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        setTimeout(() => resolve(0), 5000)
      })
    })
    expect(lcp).toBeLessThan(6000)
  })

  test('transfer size under 1.5MB (gzip) for KEV route', async ({ page }) => {
    const responses = []
    page.on('response', (r) => responses.push(r))
    await page.goto('/#/')
    await page.getByRole('heading', { name: 'KEV Dashboard' }).waitFor()
    const total = responses
      .filter((r) => r.url().includes('threatscope.insights.autos'))
      .reduce((sum, r) => sum + (Number(r.headers()['content-length'] || 0)), 0)
    expect(total).toBeLessThan(1_500_000)
  })
})
