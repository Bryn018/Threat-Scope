// Export helpers: CSV (for Splunk/Sentinel/QRadar ingestion) and
// STIX 2.1 bundles (industry-standard threat-intel interchange).

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function csvEscape(value) {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function exportCsv(rows, columns, filename) {
  const header = columns.map((c) => csvEscape(c.key)).join(',')
  const body = rows.map((r) => columns.map((c) => csvEscape(c.value(r))).join(',')).join('\n')
  download(filename, `${header}\n${body}`, 'text/csv;charset=utf-8')
}

// Build a minimal STIX 2.1 bundle from vulnerability records.
// Each KEV becomes a vulnerability object + a relationship to its CVE.
export function exportStix(vulnerabilities, epssMap = {}) {
  const objects = []
  for (const v of vulnerabilities) {
    const cveId = v.cveID
    const s = epssMap[cveId]
    const obj = {
      type: 'vulnerability',
      spec_version: '2.1',
      id: `vulnerability--${cveId.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: v.vulnerabilityName || cveId,
      external_references: [
        {
          source_name: 'cve',
          external_id: cveId,
        },
        {
          source_name: 'cisa-kev',
          url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
          description: v.shortDescription || '',
        },
      ],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    }
    if (v.cwes && v.cwes.length) {
      obj.x_cisa_weaknesses = v.cwes
    }
    if (s) {
      obj.x_epss_score = s.epss
      obj.x_epss_percentile = s.percentile
    }
    if ((v.knownRansomwareCampaignUse || '').toLowerCase() === 'known') {
      obj.x_known_ransomware = true
    }
    objects.push(obj)
  }
  const bundle = {
    type: 'bundle',
    id: `bundle--${Date.now()}`,
    objects,
  }
  return bundle
}

export function downloadJson(obj, filename) {
  download(filename, JSON.stringify(obj, null, 2), 'application/json;charset=utf-8')
}
