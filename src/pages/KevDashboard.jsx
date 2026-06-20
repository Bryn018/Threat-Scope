import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ShieldCheck, ShieldX, Clock, RefreshCw } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import Filters from '../components/Filters'
import Charts from '../components/Charts'
import ThreatTable from '../components/ThreatTable'
import ThreatModal from '../components/ThreatModal'
import { useFetch } from '../hooks/useFetch'
import {
  normalizeVulnerabilities,
  filterVulnerabilities,
  filterByCwe,
  getThreatLevel,
  buildVendorBreakdown,
  buildCweBreakdown,
  buildAttackTechniqueBreakdown,
  loadTechniqueMap,
  dateDaysAgo,
} from '../utils/threatUtils'

const KEV_FEED_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'
const STATIC_DATA_PATH = '/data/cisa-kev.json'

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
  const [selectedThreat, setSelectedThreat] = useState(null)
  const [severity, setSeverity] = useState('')
  const [vendor, setVendor] = useState('')
  const [cwe, setCwe] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [windowDays, setWindowDays] = useState(undefined)
  const [techniqueMap, setTechniqueMap] = useState({})
  const [vulnerabilities, setVulnerabilities] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [dataSource, setDataSource] = useState('')

  async function loadThreats(signal) {
    const urls = [KEV_FEED_URL, STATIC_DATA_PATH]
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
          setDataSource(url === STATIC_DATA_PATH ? 'static snapshot' : 'live CISA feed')
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

  const vendorCounts = useMemo(() => buildVendorBreakdown(vulnerabilities, 12), [vulnerabilities])

  const filteredVulnerabilities = useMemo(() => {
    const base = filterVulnerabilities(vulnerabilities, query)
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
        if (!latestCutoff) return true
        return (v.dateAdded ?? '') >= latestCutoff
      })
      .slice()
      .sort((a, b) => {
        const severityOrder = { Known: 0, Expected: 1, No: 2 }
        if (sortOrder === 'severity') return (severityOrder[deriveSeverity(a)] ?? 9) - (severityOrder[deriveSeverity(b)] ?? 9)
        const order = a.dateAdded.localeCompare(b.dateAdded)
        return sortOrder === 'newest' ? -order : order
      })
  }, [vulnerabilities, query, severity, vendor, sortOrder, windowDays, cwe])

  const metrics = useMemo(() => {
    const total = vulnerabilities.length
    const critical = vulnerabilities.filter((v) => (v.knownRansomwareCampaignUse ?? '').toLowerCase() === 'known').length
    const high = vulnerabilities.filter((v) => /immediate|immediately/i.test(v.requiredAction ?? '')).length
    const ransomware = vulnerabilities.filter((v) => (v.knownRansomwareCampaignUse ?? '').toLowerCase() === 'known').length
    const incomplete = vulnerabilities.filter((v) => deriveIncompleteStatus(v) === 'yes').length
    const todayCount = vulnerabilities.filter((v) => v.dateAdded === todayLabel()).length
    const topVendor = buildVendorBreakdown(vulnerabilities, 1)[0]
    return {
      total, critical, high, ransomware, incomplete,
      todayCount,
      topVendor: topVendor?.name ?? '—',
    }
  }, [vulnerabilities])

  const cweCounts = useMemo(() => buildCweBreakdown(vulnerabilities, 10), [vulnerabilities])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">KEV Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-400">CISA Known Exploited Vulnerabilities — real-time feed</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-500">
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Loading threat feed...
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-500/70 bg-red-500/10 p-6 text-sm text-red-200">{error}</div>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          <Filters
            value={query}
            onChange={setQuery}
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
          />

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard icon={Activity} label="Tracked Vulnerabilities" value={metrics.total.toLocaleString()} onClick={() => { setQuery(''); setSeverity(''); setVendor(''); setWindowDays(undefined) }} />
            <KpiCard icon={AlertTriangle} label="Critical Alerts" value={metrics.critical.toLocaleString()} tone="alert" onClick={() => { setQuery(''); setSeverity('Known'); setVendor(''); setWindowDays(undefined) }} />
            <KpiCard icon={ShieldCheck} label="High Alerts" value={metrics.high.toLocaleString()} tone="warning" onClick={() => { setQuery(''); setSeverity('Expected'); setVendor(''); setWindowDays(undefined) }} />
            <KpiCard icon={ShieldX} label="Ransomware Related" value={metrics.ransomware.toLocaleString()} onClick={() => { setQuery(''); setSeverity('Known'); setVendor(''); setWindowDays(undefined) }} />
            <KpiCard icon={Clock} label="Added Today" value={`${metrics.todayCount}`} onClick={() => { setQuery(''); setSeverity(''); setVendor(''); setWindowDays(1) }} />
            <KpiCard label="Top Vendor" value={metrics.topVendor} onClick={() => { setQuery(''); setSeverity(''); setVendor(metrics.topVendor); setWindowDays(undefined) }} />
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
