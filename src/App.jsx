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
} from './utils/threatUtils'

function App() {
  const [vulnerabilities, setVulnerabilities] = useState([])
  const [query, setQuery] = useState('')
  const [selectedThreat, setSelectedThreat] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadThreats() {
      setIsLoading(true)
      setError('')

      try {
        const response = await fetch(KEV_FEED_URL, { signal: controller.signal })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const payload = await response.json()
        const nextVulnerabilities = Array.isArray(payload.vulnerabilities)
          ? payload.vulnerabilities
          : []

        setVulnerabilities(nextVulnerabilities)
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

    loadThreats()

    return () => controller.abort()
  }, [])

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
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Threat Scope / SOC Dashboard</p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">Known Exploited Vulnerabilities Tracker</h1>
            <div className="w-full max-w-md">
              <SearchBar value={query} onChange={setQuery} />
            </div>
          </div>
        </header>

        {isLoading && <p className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-300">Loading threat feed...</p>}

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
                subtitle={query ? 'Filtered results' : 'All current KEV entries'}
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
