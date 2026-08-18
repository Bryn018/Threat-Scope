import { useEffect, useMemo, useState } from 'react'
import { ShieldAlert, Bug, TrendingUp, Radio, ArrowLeft } from 'lucide-react'
import { buildVendorExposure, attachEpss } from '../utils/threatUtils'

import { ENDPOINTS } from '../config/api'

const KEV_PATH = ENDPOINTS.kev
const EPSS_PATH = ENDPOINTS.epss
const EXPLOITS_PATH = ENDPOINTS.exploitsByCve

function EpssPill({ value }) {
  if (value == null) return <span className="text-muted">—</span>
  const pct = value * 100
  const color = pct >= 90 ? 'text-danger' : pct >= 50 ? 'text-high-ink' : pct >= 10 ? 'text-warning' : 'text-muted'
  return <span className={`font-medium ${color}`}>{pct.toFixed(1)}%</span>
}

function ExposureBar({ value, max, tone = 'bg-accent' }) {
  const w = max ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1.5 w-full rounded-full bg-surface-2">
      <div className={`h-1.5 rounded-full ${tone}`} style={{ width: `${w}%` }} />
    </div>
  )
}

export default function Exposure() {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('kev')
  const [selected, setSelected] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const [kevRes, epssRes, expRes] = await Promise.all([
          fetch(KEV_PATH, { signal: controller.signal }),
          fetch(EPSS_PATH, { signal: controller.signal }),
          fetch(EXPLOITS_PATH, { signal: controller.signal }),
        ])
        if (!kevRes.ok) throw new Error('KEV feed failed')
        const kev = await kevRes.json()
        const epss = epssRes.ok ? await epssRes.json() : {}
        const exploits = expRes.ok ? await expRes.json() : {}
        const enriched = attachEpss(kev.vulnerabilities, epss)
        const exposure = buildVendorExposure(enriched, epss, exploits)
        if (!controller.signal.aborted) {
          setRows(exposure)
          setLastUpdated(new Date())
        }
      } catch (e) {
        if (e.name !== 'AbortError') setError('Failed to load exposure data.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? rows.filter((r) => r.vendor.toLowerCase().includes(q)) : rows
    const sorted = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'exploit': return b.exploit - a.exploit || b.kev - a.kev
        case 'ransom': return b.ransomware - a.ransomware
        case 'epssMax': return b.epssMax - a.epssMax
        case 'epssAvg': return b.epssAvg - a.epssAvg
        default: return b.kev - a.kev
      }
    })
    return sorted
  }, [rows, query, sortKey])

  const totals = useMemo(() => {
    const kev = rows.reduce((s, r) => s + r.kev, 0)
    const exploit = rows.reduce((s, r) => s + r.exploit, 0)
    const ransom = rows.reduce((s, r) => s + r.ransomware, 0)
    const withEpss = rows.filter((r) => r.epssN > 0)
    const epssMax = withEpss.length ? Math.max(...withEpss.map((r) => r.epssMax)) : 0
    return { vendors: rows.length, kev, exploit, ransom, epssMax }
  }, [rows])

  const maxKev = Math.max(1, ...rows.map((r) => r.kev))

  if (selected) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <button
          onClick={() => setSelected(null)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Exposure Matrix
        </button>
        <VendorDetail vendor={selected} onClose={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Technology Exposure</h1>
          <p className="mt-0.5 text-sm text-muted">
            KEV × Exploit-DB × EPSS correlation by vendor — where exploited risk concentrates
          </p>
        </div>
        {lastUpdated && (
          <span className="text-xs text-muted">Updated {lastUpdated.toLocaleTimeString()} • auto-synced</span>
        )}
      </div>

      {isLoading && <div className="rounded-xl border border-border bg-surface-2/60 p-6 text-sm text-muted">Loading exposure data...</div>}
      {!isLoading && error && <div className="rounded-xl border border-red-500/70 bg-danger-soft p-6 text-sm text-danger">{error}</div>}

      {!isLoading && !error && (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={ShieldAlert} label="Vendors Tracked" value={totals.vendors.toLocaleString()} />
            <Kpi icon={Bug} label="KEVs (total)" value={totals.kev.toLocaleString()} />
            <Kpi icon={Radio} label="With Public Exploit" value={totals.exploit.toLocaleString()} tone="text-danger" />
            <Kpi icon={TrendingUp} label="Peak EPSS" value={`${(totals.epssMax * 100).toFixed(1)}%`} tone="text-high-ink" />
          </section>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by vendor..."
              className="w-full rounded-xl border border-border bg-surface-2/60 px-4 py-2.5 text-sm text-fg placeholder:text-muted focus:border-border/40 focus:outline-none sm:max-w-xs"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[
                ['kev', 'KEV count'],
                ['exploit', 'Exploits'],
                ['ransom', 'Ransomware'],
                ['epssMax', 'Max EPSS'],
                ['epssAvg', 'Avg EPSS'],
              ].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  className={`rounded-full border px-3 py-1.5 font-medium transition ${sortKey === k ? 'border-border/70 bg-surface-2/10 text-fg' : 'border-border bg-surface-2/40 text-muted hover:border-border/40'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface-2/80">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm text-fg">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2">Vendor / Technology</th>
                  <th className="px-3 py-2">KEVs</th>
                  <th className="px-3 py-2">Public Exploit</th>
                  <th className="px-3 py-2">Ransomware</th>
                  <th className="px-3 py-2">Max EPSS</th>
                  <th className="px-3 py-2">Avg EPSS</th>
                  <th className="px-3 py-2">Exposure</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.vendor}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer border-b border-border hover:bg-surface-2/60"
                  >
                    <td className="px-3 py-3 font-medium text-fg">{r.vendor}</td>
                    <td className="px-3 py-3">{r.kev}</td>
                    <td className="px-3 py-3">
                      <span className={r.exploit > 0 ? 'text-danger' : 'text-muted'}>{r.exploit}</span>
                      <span className="ml-1 text-xs text-muted">({r.exploitPct}%)</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={r.ransomware > 0 ? 'text-danger' : 'text-muted'}>{r.ransomware}</span>
                    </td>
                    <td className="px-3 py-3"><EpssPill value={r.epssMax} /></td>
                    <td className="px-3 py-3"><EpssPill value={r.epssAvg} /></td>
                    <td className="px-3 py-3 w-48">
                      <ExposureBar value={r.kev} max={maxKev} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Click any vendor for per-CVE detail. EPSS = FIRST.org Exploit Prediction Scoring System.
            Exploit counts reflect public Exploit-DB entries matched by CVE.
          </p>
        </>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, tone = 'text-fg' }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/60 p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function VendorDetail({ vendor }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const [kevRes, epssRes, expRes] = await Promise.all([
          fetch(KEV_PATH, { signal: controller.signal }),
          fetch(EPSS_PATH, { signal: controller.signal }),
          fetch(EXPLOITS_PATH, { signal: controller.signal }),
        ])
        const kev = await kevRes.json()
        const epss = epssRes.ok ? await epssRes.json() : {}
        const exploits = expRes.ok ? await expRes.json() : {}
        const list = attachEpss(kev.vulnerabilities, epss).filter(
          (v) => (v.vendorProject || 'Unknown') === vendor.vendor,
        ).map((v) => ({ ...v, hasExploit: v.cveID in exploits }))
          .sort((a, b) => (b.epss ?? -1) - (a.epss ?? -1))
        if (!controller.signal.aborted) setItems(list)
      } catch { /* ignore */ } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [vendor])

  return (
    <div>
      <h2 className="text-xl font-bold text-fg">{vendor.vendor}</h2>
      <p className="mt-1 text-sm text-muted">
        {vendor.kev} KEVs · {vendor.exploit} with public exploits · {vendor.ransomware} ransomware-linked ·
        peak EPSS {vendor.epssMax ? `${(vendor.epssMax * 100).toFixed(1)}%` : 'n/a'}
      </p>

      {loading && <div className="mt-4 text-sm text-muted">Loading CVEs...</div>}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border-strong bg-surface-2/80">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm text-fg">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2">CVE</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">EPSS</th>
              <th className="px-3 py-2">Public Exploit</th>
              <th className="px-3 py-2">Ransomware</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.cveID} className="border-b border-border">
                <td className="px-3 py-2 font-medium text-fg">{v.cveID}</td>
                <td className="px-3 py-2">{v.vulnerabilityName}</td>
                <td className="px-3 py-2"><EpssPill value={v.epss} /></td>
                <td className="px-3 py-2">{v.hasExploit ? <span className="text-danger">Yes</span> : <span className="text-muted">—</span>}</td>
                <td className="px-3 py-2">
                  {(v.knownRansomwareCampaignUse || '').toLowerCase() === 'known'
                    ? <span className="text-danger">Known</span>
                    : <span className="text-muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
