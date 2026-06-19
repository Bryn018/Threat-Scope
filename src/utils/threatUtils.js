export const KEV_FEED_URL = '/sites/default/files/feeds/known_exploited_vulnerabilities.json'

export function dateDaysAgo(days) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

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

export function buildCweBreakdown(vulnerabilities, maxEntries = 8) {
  const counts = new Map()
  for (const v of vulnerabilities) {
    const cwes = Array.isArray(v.cwes) ? v.cwes : []
    for (const cwe of cwes) {
      counts.set(cwe, (counts.get(cwe) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxEntries)
    .map(([name, value]) => ({ name, value }))
}

export function buildTimelineRows(vulnerabilities) {
  if (!vulnerabilities.length) return []
  const counts = new Map()
  for (const v of vulnerabilities) {
    const date = v.dateAdded?.slice(0, 10)
    if (!date) continue
    const key = date.slice(0, 7) // YYYY-MM
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))
}

export function filterByCwe(vulnerabilities, cwe) {
  if (!cwe) return vulnerabilities
  return vulnerabilities.filter(v => {
    const cwes = Array.isArray(v.cwes) ? v.cwes : []
    return cwes.includes(cwe)
  })
}

export async function loadTechniqueMap() {
  try {
    const response = await fetch('/data/technique-map.json')
    if (!response.ok) return {}
    return await response.json()
  } catch {
    return {}
  }
}

export function buildAttackTechniqueBreakdown(vulnerabilities, techniqueMap = {}, maxEntries = 8) {
  if (!Object.keys(techniqueMap).length) return []

  const counts = new Map()
  for (const v of vulnerabilities) {
    const cwes = Array.isArray(v.cwes) ? v.cwes : []
    for (const cwe of cwes) {
      const tech = techniqueMap[cwe]
      if (!tech) continue
      const key = tech.tactic || 'Other'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxEntries)
    .map(([name, value]) => ({ name, value }))
}
