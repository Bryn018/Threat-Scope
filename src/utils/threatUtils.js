export const KEV_STATIC_PATH = '/data/cisa-kev.json'

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
  const match = notes.match(/https?:\/\/[^\\s)]+/i)

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

export const EPSS_BANDS = [
  { key: 'critical', label: 'Critical (≥0.9)', min: 0.9, color: 'text-red-300' },
  { key: 'high', label: 'High (0.5–0.9)', min: 0.5, color: 'text-orange-300' },
  { key: 'medium', label: 'Medium (0.1–0.5)', min: 0.1, color: 'text-amber-300' },
  { key: 'low', label: 'Low (<0.1)', min: 0, color: 'text-slate-300' },
]

export function epssBand(epss) {
  if (epss == null) return 'low'
  for (const b of EPSS_BANDS) if (epss >= b.min) return b.key
  return 'low'
}

export function attachEpss(vulnerabilities, epssMap = {}) {
  return vulnerabilities.map((v) => {
    const s = epssMap[v.cveID]
    return s ? { ...v, epss: s.epss, epssPercentile: s.percentile } : v
  })
}

// Per-vendor / technology exposure rollup (real keys only: CVE, EPSS, ransomware).
export function buildVendorExposure(vulnerabilities, epssMap = {}, exploitsByCve = {}) {
  const vendors = new Map()
  for (const v of vulnerabilities) {
    const name = v.vendorProject || 'Unknown'
    const rec = vendors.get(name) || { vendor: name, kev: 0, exploit: 0, ransomware: 0, epssMax: 0, epssSum: 0, epssN: 0 }
    rec.kev += 1
    if (v.cveID in exploitsByCve) rec.exploit += 1
    if ((v.knownRansomwareCampaignUse || '').toLowerCase() === 'known') rec.ransomware += 1
    const s = epssMap[v.cveID]
    if (s) {
      rec.epssMax = Math.max(rec.epssMax, s.epss)
      rec.epssSum += s.epss
      rec.epssN += 1
    }
    vendors.set(name, rec)
  }
  return [...vendors.values()]
    .map((r) => ({
      ...r,
      epssAvg: r.epssN ? r.epssSum / r.epssN : 0,
      exploitPct: r.kev ? Math.round((r.exploit / r.kev) * 100) : 0,
    }))
    .sort((a, b) => b.kev - a.kev || b.ransomware - a.ransomware)
}
