import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ShieldCheck, ShieldX, Rss } from 'lucide-react'
import KpiCard from './components/KpiCard'
import Filters from './components/Filters'
import Charts from './components/Charts'
import ThreatTable from './components/ThreatTable'
import ThreatModal from './components/ThreatModal'
import {
  KEV_FEED_URL,
  normalizeVulnerabilities,
  filterVulnerabilities,
} from './utils/threatUtils'

const STATIC_DATA_PATH = '/data/cisa-kev.json'

function isDevelopment() {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

function App() {
  const [vulnerabilities, setVulnerabilities] = useState([])
  const [query, setQuery] = useState('')
  const [selectedThreat, setSelectedThreat] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [dataSource, setDataSource] = useState('')

  async function loadThreats(signal) {
    const urls = isDevelopment() ? [KEV_FEED_URL, STATIC_DATA_PATH] : [STATIC_DATA_PATH, KEV_FEED_URL]
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
          setLastUpdated(new Date().toLocaleString())
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
    if (typeof window === 'undefined' || isLoading || !isDevelopment()) return
    const VISIBLE_INTERVAL = 60 * 1000
    const POLL_INTERVAL = 5 * 60 * 1000
    let timeoutId
    let controller
    let cancelled = false
    async function scheduleNext(interval) {
      timeoutId = setTimeout(async () => {
        if (cancelled) return
        controller = new AbortController()
        setIsRefreshing(true)
        try {
          await loadThreats(controller.signal)
        } catch (fetchError) {
          if (fetchError.name !== 'AbortError') setError('Background refresh failed. Data may be stale.')
        } finally {
          if (!cancelled) {
            setIsRefreshing(false)
            scheduleNext(document.hidden ? POLL_INTERVAL : VISIBLE_INTERVAL)
          }
        }
      }, interval)
    }
    function handleVisibilityChange() {
      if (document.hidden) {
        clearTimeout(timeoutId)
        scheduleNext(POLL_INTERVAL)
      } else {
        clearTimeout(timeoutId)
        scheduleNext(VISIBLE_INTERVAL)
      }
    }
    scheduleNext(VISIBLE_INTERVAL)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (controller) controller.abort()
      cancelled = true
    }
  }, [isLoading])

  const filteredVulnerabilities = useMemo(
    () => filterVulnerabilities(vulnerabilities, query),
    [vulnerabilities, query]
  )

  const metrics = useMemo(() => {
    const total = vulnerabilities.length
    const critical = vulnerabilities.filter((v) => (v.knownRansomwareCampaignUse ?? '').toLowerCase() === 'known').length
    const high = vulnerabilities.filter((v) => /immediate|immediately/i.test(v.requiredAction ?? '')).length
    const ransomware = vulnerabilities.filter((v) => (v.knownRansomwareCampaignUse ?? '').toLowerCase() === 'known').length
    const remade = vulnerabilities.filter((v) => (v.notes ?? '').toLowerCase().includes('remdiation')).length
    const topVendor = vulnerabilities.reduce((acc, v) => {
      const vendor = v.vendorProject || 'Unknown'
      acc.set(vendor, (acc.get(vendor) ?? 0) + 1)
      return acc
    }, new Map())
    const topVendorEntry = [...topVendor.entries()].sort((a, b) => b[1] - a[1])[0]
    return { total, critical, high, ransomware, remade, topVendor: topVendorEntry?.[0] ?? '—' }
  }, [vulnerabilities])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="space-y-0.5">
            <p className="text-xs uppercase tracking-widest text-slate-400">Threat Scope / SOC Dashboard</p>
            <h1 className="text-2xl font-semibold text-white">Known Exploited Vulnerabilities Tracker</h1>
          </div>
          <div className="flex items-center gap-4">
            {isRefreshing && <span className="text-xs text-slate-400">Refreshing…</span>}
            {lastUpdated && !isRefreshing && (
              <span className="text-xs text-slate-500">
                Updated {lastUpdated}
                {dataSource && !isDevelopment() && ` • ${dataSource}`}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {isLoading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">Loading threat feed...</div>
        )}
        {!isLoading && error && (
          <div className="rounded-xl border border-red-500/70 bg-red-500/10 p-6 text-sm text-red-200">{error}</div>
        )}
        {!isLoading && !error && (
          <div className="space-y-6">
            <Filters value={query} onChange={setQuery} />

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard icon={Activity} label="Tracked Vulnerabilities" value={metrics.total.toLocaleString()} />
              <KpiCard icon={AlertTriangle} label="Critical Alerts" value={metrics.critical.toLocaleString()} tone="alert" />
              <KpiCard icon={ShieldCheck} label="High Alerts" value={metrics.high.toLocaleString()} tone="warning" />
              <KpiCard icon={ShieldX} label="Ransomware Related" value={metrics.ransomware.toLocaleString()} />
              <KpiCard icon={Rss} label="Remediation Notes" value={`${metrics.remade} with notes`} />
              <KpiCard label="Top Vendor" value={metrics.topVendor} />
            </section>

            <Charts vulnerabilities={filteredVulnerabilities} />

            <ThreatTable
              vulnerabilities={filteredVulnerabilities}
              onSelect={setSelectedThreat}
            />
          </div>
        )}
      </main>

      <ThreatModal vulnerability={selectedThreat} onClose={() => setSelectedThreat(null)} />
    </div>
  )
}

export default App
