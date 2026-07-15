import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { lazy } from 'react'

// Smoke tests: confirm each route renders without throwing and shows its
// heading. Data is read from the local /public mirrored JSON via the dev
// server; these guard against regressions in page wiring, not external feeds.

const pages = [
  { name: 'KEV Dashboard', path: '/', heading: /KEV Dashboard/i },
  { name: 'CVE Explorer', path: '/cves', heading: /CVE Explorer/i },
  { name: 'ATT&CK Matrix', path: '/attack', heading: /MITRE ATT&CK Matrix/i },
  { name: 'Threat Intel', path: '/intel', heading: /Threat Intelligence/i },
  { name: 'IOC Lookup', path: '/iocs', heading: /IOC Lookup/i },
  { name: 'Exploit Tracker', path: '/exploits', heading: /Exploit Tracker/i },
  { name: 'Resources', path: '/resources', heading: /Security Resources/i },
]

describe('page smoke tests', () => {
  for (const p of pages) {
    it(`renders ${p.name}`, async () => {
      const mod = await import(`../pages/${pageFile(p.path)}`)
      const Page = mod.default
      render(
        <MemoryRouter initialEntries={[p.path]}>
          <Page />
        </MemoryRouter>,
      )
      await waitFor(
        () => expect(screen.getAllByText(p.heading).length).toBeGreaterThan(0),
        { timeout: 4000 },
      )
    })
  }
})

function pageFile(path) {
  return {
    '/': 'KevDashboard',
    '/cves': 'CveExplorer',
    '/attack': 'AttackMatrix',
    '/intel': 'ThreatIntel',
    '/iocs': 'IocLookup',
    '/exploits': 'ExploitTracker',
    '/resources': 'Resources',
  }[path]
}

// Ensure the ErrorBoundary fallback does not crash on a thrown error during render.
describe('ErrorBoundary', () => {
  it('catches render errors and shows fallback', async () => {
    const { default: ErrorBoundary } = await import('../components/ErrorBoundary')
    const Boom = () => {
      throw new Error('boom')
    }
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/Something went wrong/i)).toBeTruthy()
  })
})
