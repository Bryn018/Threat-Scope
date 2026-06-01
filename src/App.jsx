import { useEffect, useMemo, useState } from 'react'
import { Activity, ShieldCheck, ShieldX } from 'lucide-react'
import MetricCard from './components/MetricCard'
import SearchBar from './components/SearchBar'
import ThreatChart from './components/ThreatChart'
import ThreatModal from './components/ThreatModal'
import ThreatTable from './components/ThreatTable'
import {
  KEV_FEED_URL,
  buildVendorBreakdown,
  filterVulnerabilities,
  getThreatLevel,
  normalizeVulnerabilities,
} from './utils/threatUtils'

const STATIC_DATA_PATH = '/data/cisa-kev.json'

function isDevelopment() {
  if (typeof window === 'undefined') {
    return false
  }

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
        if (fetchError.name === 'AbortError') {
          throw fetchError
        }

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
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    initialise()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || isLoading || !isDevelopment()) {
      return
    }

    const VISIBLE_INTERVAL = 60 * 1000
    const POLL_INTERVAL = 5 * 60 * 1000

    let timeoutId
    let controller
    let cancelled = false

    async function scheduleNext(interval) {
      timeoutId = setTimeout(async () => {
        if (cancelled) {
          return
        }

        controller = new AbortController()
        setIsRefreshing(true)

        try {
          await loadThreats(controller.signal)
        } catch (fetchError) {
          if (fetchError.name !== 'AbortError') {
            setError('Background refresh failed. Data may be stale.')
          }
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

      if (controller) {
        controller.abort()
      }

      cancelled = true
    }
  }, [isLoading])

  const filteredVulnerabilities = useMemo(
    () => filterVulnerabilities(vulnerabilities, query),
    [vulnerabilities, query],
  )

  const metrics = useMemo(() => {
    const critical = vulnerabilities.filter((vulnerability) => getThreatLevel(vulnerability) === 'critical').length
    const high = vulnerabilities.filter((vulnerability) => getThreatLevel(vulnerability) === 'high').length

    return { critical, high }
  }, [vulnerabilities])

  const chartData = useMemo(() => buildVendorBreakdown(filteredVulnerabilities), [filteredVulnerabilities])

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Threat Scope / SOC Dashboard</p>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">Known Exploited Vulnerabilities Tracker</h1>
            </div>
            <div className="flex items-center gap-3">
              {isRefreshing && (
                <span className="text-xs text-slate-400">Refreshing…</span>
              )}
              {lastUpdated && !isRefreshing && (
                <span className="text-xs text-slate-500">
                  Updated {lastUpdated}
                  {dataSource && !isDevelopment() && ` • ${dataSource}`}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
          </div>
          <div className="w-full max-w-md">
            <SearchBar value={query} onChange={setQuery} />
          </div>
        </header>

        {isLoading && (
          <p className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-300">Loading threat feed...</p>
        )}

        {!isLoading && error && (
          <p className="rounded-xl border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>
        )}

        {!isLoading && !error && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                icon={Activity}
                label="Tracked Vulnerabilities"
                value={filteredVulnerabilities.length.toLocaleString()}
                subtitle={isDevelopment() ? 'Auto-refreshing KEV catalog' : 'Snapshot'}
              />
              <MetricCard icon={ShieldX} label="Critical Alerts" value={metrics.critical.toLocaleString()} tone="alert" />
              <MetricCard icon={ShieldCheck} label="High Alerts" value={metrics.high.toLocaleString()} tone="warning" />
            </section>

            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <ThreatChart data={chartData} />

              {filteredVulnerabilities.length === 0 ? (
                <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-6 text-sm text-slate-400">
                  No vulnerabilities match your current search.
                </section>
              ) : (
                <ThreatTable vulnerabilities={filteredVulnerabilities} onSelect={setSelectedThreat} />
              )}
            </div>
          </>
        )}
      </div>

      <ThreatModal vulnerability={selectedThreat} onClose={() => setSelectedThreat(null)} />
    </main>
  )
}

export default App
