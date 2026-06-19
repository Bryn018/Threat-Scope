export const KEV_FEED_URL = '/sites/default/files/feeds/known_exploited_vulnerabilities.json'

export function getThreatLevel(vulnerability) {
  if (!vulnerability) {
    return 'standard'
  }

  if (vulnerability.knownRansomwareCampaignUse === 'Known') {
    return 'critical'
  }

  if (/immediate|immediately/i.test(vulnerability.requiredAction ?? '')) {
    return 'high'
  }

  return 'standard'
}

export function getRemediationLink(vulnerability) {
  const notes = vulnerability?.notes ?? ''
  const match = notes.match(/https?:\/\/[^\s)]+/i)

  if (match) {
    return match[0]
  }

  return vulnerability?.cveID
    ? `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(vulnerability.cveID)}`
    : 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog'
}

export function buildVendorBreakdown(vulnerabilities, maxEntries = 6) {
  const counts = vulnerabilities.reduce((acc, vulnerability) => {
    const vendor = vulnerability.vendorProject || 'Unknown'
    acc.set(vendor, (acc.get(vendor) ?? 0) + 1)
    return acc
  }, new Map())

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxEntries)
    .map(([name, value]) => ({ name, value }))
}

export function filterVulnerabilities(vulnerabilities, query) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return vulnerabilities
  }

  return vulnerabilities.filter((vulnerability) => {
    const searchable = [
      vulnerability.cveID,
      vulnerability.vendorProject,
      vulnerability.vulnerabilityName,
      vulnerability.shortDescription,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return searchable.includes(normalizedQuery)
  })
}

export function normalizeVulnerabilities(payload) {
  if (Array.isArray(payload.vulnerabilities)) {
    return payload.vulnerabilities
  }

  if (Array.isArray(payload)) {
    return payload
  }

  return []
}
