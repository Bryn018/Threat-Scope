import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Activity, AlertTriangle, ShieldCheck, ShieldX, Clock, RefreshCw, TrendingUp, Download } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import Filters from '../components/Filters'
import Charts from '../components/Charts'
import ThreatTable from '../components/ThreatTable'
import ThreatModal from '../components/ThreatModal'
import Glossary from '../components/Glossary'
import { exportCsv, exportStix, downloadJson } from '../utils/exportUtils'
import {
  normalizeVulnerabilities,
  filterVulnerabilities,
  filterByCwe,
  buildVendorBreakdown,
  buildCweBreakdown,
  loadTechniqueMap,
  dateDaysAgo,
  attachEpss,
  epssBand,
} from '../utils/threatUtils'

const STATIC_DATA_PATH = '/data/cisa-kev.json'
const EPSS_PATH = '/data/epss-scores.json'

function todayLabel() {
  return new Date().toLocaleDateString('en-CA')
}

function deriveSeverity(vulnerability) {
  if ((vulnerability.knownRansomwareCampaignUse ?? '').toLowerCase() === 'known') return 'Known'
  if (/immediate|immediately/i.test(vulnerability.requiredAction ?? '')) return 'Expected'
  return 'No'
}

function deriveIncompleteStatus(vulnerability) {
  const notes = (vulnerability.notes ?? '').toLowerCase()
  if (notes.includes('ian') || notes.includes('rp')) return 'yes'
  if (notes.includes('compliance') || notes.includes('assessment')) return 'possible'
  return 'no'
}

export default function KevDashboard() {
  const [query, setQuery] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  // Seed the filter from ?q= (deep links from unified search) and keep URL in sync.
  useEffect(() => {
    const q = searchParams.get('q')
    if (q != null) setQuery(q)
  }, [searchParams])
  const onQueryChange = (v) => {
    setQuery(v)
    if (v) setSearchParams((p) => { p.set('q', v); return p }, { replace: true })
    else setSearchParams((p) => { p.delete('q'); return p }, { replace: true })
  }
  const [selectedThreat, setSelectedThreat] = useState(null)
  const [severity, setSeverity] = useState('')
  const [vendor, setVendor] = useState('')
  const [cwe, setCwe] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [windowDays, setWindowDays] = useState(undefined)
  const [techniqueMap, setTechniqueMap] = useState({})
  const [epssMap, setEpssMap] = useState({})
  const [epssFilter, setEpssFilter] = useState('')
  const [vulnerabilities, setVulnerabilities] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [dataSource, setDataSource] = useState('')

  async function loadEpss(signal) {
    try {
      const res = await fetch(EPSS_PATH, { signal })
      if (res.ok) {
        const map = await res.json()
        if (!signal.aborted) setEpssMap(map)
      }
    } catch (e) {
      if (e.name !== 'AbortError') { /* EPSS is an enhancement; ignore failure */ }
    }
  }

  async function loadThreats(signal) {
    const urls = [STATIC_DATA_PATH]
    let lastError = null
    for (const url of urls) {
      try {
        const response = await fetch(url, { signal })
        if (!response.ok) {
          lastError = new Error(`Request failed with status ${response.status}`)
          continue
        }
        const payload = await response.json()
        const nextVulnerabilities = normalizeVulnerabilities(payload)
        if (nextVulnerabilities.length > 0) {
          setVulnerabilities(nextVulnerabilities)
          setDataSource('auto-synced snapshot')
          setLastUpdated(new Date())
          return
        }
        lastError = new Error('Empty dataset')
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') throw fetchError
        lastError = fetchError
      }
    }
    throw lastError ?? new Error('Failed to load threat feed from all sources.')
  }

  useEffect(() => {
    const controller = new AbortController()
    async function initialise() {
      try {
        await loadThreats(controller.signal)
        await loadEpss(controller.signal)
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError('Failed to load threat feed. Please try again.')
          setVulnerabilities([])
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    initialise()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function loadTechMap() {
      const map = await loadTechniqueMap()
      if (!controller.signal.aborted) setTechniqueMap(map)
    }
    loadTechMap()
    return () => controller.abort()
  }, [])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (isLoading) return
    const interval = setInterval(async () => {
      try {
        const controller = new AbortController()
        await loadThreats(controller.signal)
      } catch {
        // Silent fail on background refresh
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [isLoading])

  const enrichedVulnerabilities = useMemo(
    () => attachEpss(vulnerabilities, epssMap),
    [vulnerabilities, epssMap],
  )

  const vendorCounts = useMemo(() => buildVendorBreakdown(enrichedVulnerabilities, 12), [enrichedVulnerabilities])

  const filteredVulnerabilities = useMemo(() => {
    const base = filterVulnerabilities(enrichedVulnerabilities, query)
    const latestCutoff = windowDays ? dateDaysAgo(Number(windowDays)) : undefined
    return filterByCwe(base, cwe)
      .filter((v) => {
        if (!severity) return true
        return deriveSeverity(v) === severity
      })
      .filter((v) => {
        if (!vendor) return true
        return (v.vendorProject || 'Unknown') === vendor
      })
      .filter((v) => {
        if (epssFilter) return epssBand(v.epss) === epssFilter
        return true
      })
      .filter((v) => {
        if (!latestCutoff) return true
        return (v.dateAdded ?? '') >= latestCutoff
      })
      .slice()
      .sort((a, b) => {
        if (sortOrder === 'epss') return (b.epss ?? -1) - (a.epss ?? -1)
        const severityOrder = { Known: 0, Expected: 1, No: 2 }
        if (sortOrder === 'severity') return (severityOrder[deriveSeverity(a)] ?? 9) - (severityOrder[deriveSeverity(b)] ?? 9)
        const order = a.dateAdded.localeCompare(b.dateAdded)
        return sortOrder === 'newest' ? -order : order
      })
  }, [enrichedVulnerabilities, query, severity, vendor, sortOrder, windowDays, cwe, epssFilter])

  const metrics = useMemo(() => {
    const total = enrichedVulnerabilities.length
    const critical = enrichedVulnerabilities.filter((v) => (v.knownRansomwareCampaignUse ?? '').toLowerCase() === 'known').length
    const high = enrichedVulnerabilities.filter((v) => /immediate|immediately/i.test(v.requiredAction ?? '')).length
    const ransomware = enrichedVulnerabilities.filter((v) => (v.knownRansomwareCampaignUse ?? '').toLowerCase() === 'known').length
    const incomplete = enrichedVulnerabilities.filter((v) => deriveIncompleteStatus(v) === 'yes').length
    const todayCount = enrichedVulnerabilities.filter((v) => v.dateAdded === todayLabel()).length
    const topVendor = buildVendorBreakdown(enrichedVulnerabilities, 1)[0]
    const epssCritical = enrichedVulnerabilities.filter((v) => (v.epss ?? 0) >= 0.9).length
    const epssHigh = enrichedVulnerabilities.filter((v) => (v.epss ?? 0) >= 0.5 && (v.epss ?? 0) < 0.9).length
    return {
      total, critical, high, ransomware, incomplete,
      todayCount,
      topVendor: topVendor?.name ?? '—',
      epssCritical, epssHigh,
    }
  }, [enrichedVulnerabilities])

  const cweCounts = useMemo(() => buildCweBreakdown(enrichedVulnerabilities, 10), [enrichedVulnerabilities])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">KEV Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted">CISA Known Exploited Vulnerabilities — real-time feed</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted">
              Updated {lastUpdated.toLocaleTimeString()} {dataSource && `• ${dataSource}`}
            </span>
          )}
          <button
            onClick={async () => {
              setIsLoading(true)
              try {
                const controller = new AbortController()
                await loadThreats(controller.signal)
              } catch { /* silent */ } finally {
                setIsLoading(false)
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 text-xs text-muted hover:border-accent-border hover:text-fg"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <Glossary />
          <button
            onClick={() => {
              const cols = [
                { key: 'cveID', value: (v) => v.cveID },
                { key: 'vendorProject', value: (v) => v.vendorProject },
                { key: 'vulnerabilityName', value: (v) => v.vulnerabilityName },
                { key: 'epss', value: (v) => (v.epss != null ? v.epss : '') },
                { key: 'knownRansomwareCampaignUse', value: (v) => v.knownRansomwareCampaignUse },
                { key: 'dateAdded', value: (v) => v.dateAdded },
              ]
              exportCsv(filteredVulnerabilities, cols, `threatscope-kev-${Date.now()}.csv`)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 text-xs text-muted hover:border-accent-border hover:text-fg"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={() => {
              const bundle = exportStix(filteredVulnerabilities, epssMap)
              downloadJson(bundle, `threatscope-kev-${Date.now()}.stix.json`)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 text-xs text-muted hover:border-accent-border hover:text-fg"
          >
            <Download className="h-3.5 w-3.5" />
            STIX
          </button>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-ok-soft px-3 py-1.5 text-xs font-medium text-ok">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
            </span>
            Auto-synced
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-border bg-surface-2/60 p-6 text-sm text-muted">
          Loading threat feed...
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-500/70 bg-danger-soft p-6 text-sm text-danger">{error}</div>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          <Filters
            value={query}
            onChange={onQueryChange}
            severity={severity}
            onSeverityChange={setSeverity}
            vendor={vendor}
            onVendorChange={setVendor}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            vendors={vendorCounts}
            windowDays={windowDays}
            onWindowChange={setWindowDays}
            cwe={cwe}
            onCweChange={setCwe}
            cwes={cweCounts}
            epss={epssFilter}
            onEpssChange={setEpssFilter}
          />

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard icon={Activity} label="Tracked Vulnerabilities" value={metrics.total.toLocaleString()} onClick={() => { setQuery(''); setSeverity(''); setVendor(''); setWindowDays(undefined); setEpssFilter('') }} />
            <KpiCard icon={AlertTriangle} label="Critical Alerts" value={metrics.critical.toLocaleString()} tone="alert" onClick={() => { setQuery(''); setSeverity('Known'); setVendor(''); setWindowDays(undefined); setEpssFilter('') }} />
            <KpiCard icon={TrendingUp} label="EPSS ≥0.9 (Critical)" value={metrics.epssCritical.toLocaleString()} tone="alert" onClick={() => { setQuery(''); setSeverity(''); setVendor(''); setWindowDays(undefined); setEpssFilter('critical') }} />
            <KpiCard icon={ShieldCheck} label="High Alerts" value={metrics.high.toLocaleString()} tone="warning" onClick={() => { setQuery(''); setSeverity('Expected'); setVendor(''); setWindowDays(undefined); setEpssFilter('') }} />
            <KpiCard icon={ShieldX} label="Ransomware Related" value={metrics.ransomware.toLocaleString()} onClick={() => { setQuery(''); setSeverity('Known'); setVendor(''); setWindowDays(undefined); setEpssFilter('') }} />
            <KpiCard icon={Clock} label="Added Today" value={`${metrics.todayCount}`} onClick={() => { setQuery(''); setSeverity(''); setVendor(''); setWindowDays(1); setEpssFilter('') }} />
            <KpiCard label="Top Vendor" value={metrics.topVendor} onClick={() => { setQuery(''); setSeverity(''); setVendor(metrics.topVendor); setWindowDays(undefined); setEpssFilter('') }} />
          </section>

          <Charts
            vulnerabilities={filteredVulnerabilities}
            onFilterVendor={setVendor}
            onFilterCwe={setCwe}
            onFilterSeverity={(severityKey) => setSeverity((current) => (current === severityKey ? '' : severityKey))}
            techniqueMap={techniqueMap}
          />

          <ThreatTable
            vulnerabilities={filteredVulnerabilities}
            onSelect={setSelectedThreat}
          />
        </div>
      )}

      <ThreatModal vulnerability={selectedThreat} onClose={() => setSelectedThreat(null)} techniqueMap={techniqueMap} />
    </div>
  )
}
