import { useState } from 'react'
import { Search, ExternalLink, Info } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'

const NVD_API_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0'

function buildNvdUrl(params) {
  const sp = new URLSearchParams()
  if (params.keyword) sp.set('keywordSearch', params.keyword)
  if (params.cvssSeverity) sp.set('cvssV3Severity', params.cvssSeverity)
  sp.set('resultsPerPage', '50')
  sp.set('startIndex', String(params.startIndex || 0))
  return `${NVD_API_BASE}?${sp.toString()}`
}

function severityColor(score) {
  if (score >= 9) return 'text-danger'
  if (score >= 7) return 'text-high'
  if (score >= 4) return 'text-yellow-400'
  return 'text-ok'
}

function severityBg(score) {
  if (score >= 9) return 'border-red-500/40 bg-danger-soft'
  if (score >= 7) return 'border-high-soft bg-high-soft'
  if (score >= 4) return 'border-yellow-500/40 bg-yellow-500/10'
  return 'border-green-500/40 bg-ok-soft'
}

function getCveScore(cve) {
  const metrics = cve?.metrics
  if (!metrics) return 0
  const cvss3 = metrics.cvssMetricV31?.[0] || metrics.cvssMetricV30?.[0]
  if (cvss3) return cvss3.cvssData?.baseScore || 0
  const cvss2 = metrics.cvssMetricV2?.[0]
  return cvss2?.cvssData?.baseScore || 0
}

function getCveSeverity(cve) {
  const metrics = cve?.metrics
  if (!metrics) return 'UNKNOWN'
  const cvss3 = metrics.cvssMetricV31?.[0] || metrics.cvssMetricV30?.[0]
  if (cvss3) return cvss3.cvssData?.baseSeverity || 'UNKNOWN'
  return metrics.cvssMetricV2?.[0]?.baseSeverity || 'UNKNOWN'
}

export default function CveExplorer() {
  const [searchTerm, setSearchTerm] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [page, setPage] = useState(0)
  const [selectedCve, setSelectedCve] = useState(null)

  const apiUrl = inputValue.trim()
    ? buildNvdUrl({ keyword: inputValue.trim(), cvssSeverity: severityFilter, startIndex: page * 50 })
    : null

  const { data, isLoading, error, lastUpdated } = useFetch(apiUrl, {
    transform: (raw) => ({
      totalResults: raw.totalResults || 0,
      vulnerabilities: raw.vulnerabilities || [],
    }),
    initialData: { totalResults: 0, vulnerabilities: [] },
    ttl: 3 * 60 * 1000,
  })

  const totalPages = Math.ceil((data?.totalResults || 0) / 50)

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(0)
    setSearchTerm(inputValue)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">CVE Explorer</h1>
        <p className="mt-0.5 text-sm text-muted">
          Search the NIST National Vulnerability Database — real-time CVE data
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search CVEs by keyword, product, or CVE-ID (e.g., 'Apache', 'CVE-2024-1234')"
            className="w-full rounded-xl border border-border bg-surface-2/60 px-9 py-2.5 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(0) }}
          aria-label="Filter CVEs by severity"
          className="rounded-xl border border-border bg-surface-2/60 px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-accent px-6 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Search
        </button>
      </form>

      {/* Results info */}
      {searchTerm && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted">
            {data?.totalResults?.toLocaleString() || 0} results for "{searchTerm}"
            {lastUpdated && <span className="ml-2 text-muted">• Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
      )}

      {/* Loading / Error */}
      {isLoading && (
        <div className="rounded-xl border border-border bg-surface-2/60 p-8 text-center text-sm text-muted">
          Searching NVD database...
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/70 bg-danger-soft p-6 text-sm text-danger">
          Error: {error}. The NVD API may be rate-limited. Try again in a moment.
        </div>
      )}

      {/* Results table */}
      {!isLoading && !error && data?.vulnerabilities?.length > 0 && (
        <div className="space-y-3">
          {data.vulnerabilities.map((item) => {
            const cve = item.cve
            const score = getCveScore(cve)
            const sev = getCveSeverity(cve)
            const desc = cve?.descriptions?.find((d) => d.lang === 'en')?.value || 'No description available'
            const published = cve?.published?.slice(0, 10) || '—'

            return (
              <div
                key={cve.id}
                className={`cursor-pointer rounded-xl border p-4 transition hover:border-border/20 ${severityBg(score)}`}
                onClick={() => setSelectedCve(cve)}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-fg">{cve.id}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${severityColor(score)}`}>
                        {score > 0 ? `${score} — ${sev}` : 'Unscored'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted line-clamp-2">{desc}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span>Published: {published}</span>
                      {cve?.references?.length > 0 && (
                        <span>{cve.references.length} reference{cve.references.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted" />
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 text-xs text-muted hover:border-border-strong disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-muted">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 text-xs text-muted hover:border-border-strong disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && searchTerm && data?.vulnerabilities?.length === 0 && (
        <div className="rounded-xl border border-border bg-surface-2/60 p-8 text-center text-sm text-muted">
          No CVEs found for "{searchTerm}". Try a different search term.
        </div>
      )}

      {/* Initial state */}
      {!searchTerm && !isLoading && (
        <div className="rounded-xl border border-border bg-surface-2/60 p-12 text-center">
          <Info className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-3 text-sm text-muted">Search the NVD database to explore CVEs</p>
          <p className="mt-1 text-xs text-muted">Try "Apache", "Windows", "CVE-2024", or any product name</p>
        </div>
      )}

      {/* CVE Detail Modal */}
      {selectedCve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70 p-4" onClick={() => setSelectedCve(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-border-strong bg-surface-2 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-lg font-bold text-fg">{selectedCve.id}</p>
                <p className="mt-1 text-sm text-muted">Published: {selectedCve.published?.slice(0, 10) || '—'}</p>
              </div>
              <button onClick={() => setSelectedCve(null)} className="rounded-md border border-border-strong p-1.5 text-muted hover:text-fg">✕</button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted">Description</h3>
                <p className="mt-1 text-sm text-fg">{selectedCve?.descriptions?.find((d) => d.lang === 'en')?.value || 'No description'}</p>
              </div>

              {getCveScore(selectedCve) > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-muted">CVSS Score</h3>
                  <p className={`mt-1 text-lg font-bold ${severityColor(getCveScore(selectedCve))}`}>
                    {getCveScore(selectedCve)} — {getCveSeverity(selectedCve)}
                  </p>
                </div>
              )}

              {selectedCve?.references?.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-muted">References</h3>
                  <ul className="mt-2 space-y-1">
                    {selectedCve.references.slice(0, 10).map((ref, i) => (
                      <li key={i}>
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-accent hover:text-accent hover:underline"
                        >
                          {ref.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <a
                href={`https://nvd.nist.gov/vuln/detail/${selectedCve.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-sky-500/70 bg-accent-soft px-4 py-2 text-sm font-medium text-accent hover:bg-sky-500/20"
              >
                View on NVD <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
