import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const sampleResponse = {
  vulnerabilities: [
    {
      cveID: 'CVE-2024-0001',
      vendorProject: 'Acme Corp',
      vulnerabilityName: 'Acme Auth Bypass',
      shortDescription: 'Authentication bypass in Acme Gateway',
      dateAdded: '2025-03-01',
      requiredAction: 'Apply the latest update immediately.',
      knownRansomwareCampaignUse: 'Known',
      notes: 'https://vendor.example.com/patch',
    },
    {
      cveID: 'CVE-2024-0002',
      vendorProject: 'Blue Security',
      vulnerabilityName: 'Blue Overflow',
      shortDescription: 'Overflow in parser',
      dateAdded: '2025-04-10',
      requiredAction: 'Update to patched release.',
      knownRansomwareCampaignUse: 'Unknown',
      notes: '',
    },
  ],
}

describe('App dashboard', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleResponse),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('filters threats by search query', async () => {
    render(<App />)

    await screen.findByText('CVE-2024-0001')

    fireEvent.change(screen.getByPlaceholderText(/search by cve, vendor, or description/i), {
      target: { value: 'blue' },
    })

    await waitFor(() => {
      expect(screen.queryByText('CVE-2024-0001')).not.toBeInTheDocument()
      expect(screen.getByText('CVE-2024-0002')).toBeInTheDocument()
    })
  })

  it('opens and closes detail modal from table row click', async () => {
    render(<App />)

    const rowValue = await screen.findByText('CVE-2024-0001')
    fireEvent.click(rowValue)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/official remediation/i)).toHaveAttribute('href', 'https://vendor.example.com/patch')

    fireEvent.click(screen.getByRole('button', { name: /close details/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
