import { useState } from 'react'
import { AlertTriangle, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react'
import { getThreatLevel, epssBand } from '../utils/threatUtils'

const PAGE_SIZE = 50

const levelStyles = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-400',
  standard: 'border-l-slate-700',
}

const epssStyles = {
  critical: 'text-red-300',
  high: 'text-orange-300',
  medium: 'text-amber-300',
  low: 'text-slate-400',
}

function ThreatBadge({ level }) {
  if (level === 'critical') {
    return <ShieldAlert className="h-4 w-4 text-red-300" aria-label="Critical threat" />
  }

  if (level === 'high') {
    return <AlertTriangle className="h-4 w-4 text-orange-300" aria-label="High threat" />
  }

  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-500" aria-hidden="true" />
}

function EpssCell({ epss }) {
  if (epss == null) return <span className="text-slate-400">—</span>
  const band = epssBand(epss)
  return (
    <span className={`font-medium ${epssStyles[band]}`}>
      {(epss * 100).toFixed(1)}%
    </span>
  )
}

export default function ThreatTable({ vulnerabilities, onSelect }) {
  const [page, setPage] = useState(0)
  const total = vulnerabilities.length
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * PAGE_SIZE
  const rows = vulnerabilities.slice(start, start + PAGE_SIZE)

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">Live Threat Feed</h2>
        <span className="text-xs text-slate-400" aria-live="polite">
          {total === 0 ? 'No results' : `${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total}`}
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm text-slate-200">
          <thead className="text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-2">Risk</th>
              <th className="px-3 py-2">CVE ID</th>
              <th className="px-3 py-2">Vendor/Project</th>
              <th className="px-3 py-2">Vulnerability Name</th>
              <th className="px-3 py-2">EPSS</th>
              <th className="px-3 py-2">Date Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((vulnerability) => {
              const level = getThreatLevel(vulnerability)
              return (
                <tr
                  key={vulnerability.cveID}
                  className={`cursor-pointer border-l-4 border-b border-slate-800 hover:bg-slate-800/60 ${levelStyles[level]}`}
                  onClick={() => onSelect(vulnerability)}
                >
                  <td className="px-3 py-3">
                    <ThreatBadge level={level} />
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-100">{vulnerability.cveID}</td>
                  <td className="px-3 py-3">{vulnerability.vendorProject}</td>
                  <td className="px-3 py-3">{vulnerability.vulnerabilityName}</td>
                  <td className="px-3 py-3"><EpssCell epss={vulnerability.epss} /></td>
                  <td className="px-3 py-3 text-slate-300">{vulnerability.dateAdded}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-white/40 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-xs text-slate-400">Page {safePage + 1} of {pageCount}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-white/40 disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  )
}
