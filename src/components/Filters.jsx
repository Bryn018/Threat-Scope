import { Search } from 'lucide-react'

const SEVERITY_OPTIONS = ['Known', 'Expected', 'No']
const WINDOW_OPTIONS = [
  { label: 'last 24h', value: '1' },
  { label: 'last 7d', value: '7' },
  { label: 'last 30d', value: '30' },
  { label: 'last 90d', value: '90' },
]

export default function Filters({ value, onChange, severity, onSeverityChange, vendor, onVendorChange, sortOrder, onSortOrderChange, vendors, windowDays, onWindowChange, cwe, onCweChange, cwes }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search vulnerabilities (CVE, vendor, note)"
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-9 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortOrder}
            onChange={(event) => onSortOrderChange(event.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200 focus:border-white/40 focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="severity">Highest severity first</option>
          </select>
          <select
            value={vendor}
            onChange={(event) => onVendorChange(event.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200 focus:border-white/40 focus:outline-none"
          >
            <option value="">All vendors</option>
            {(vendors || []).map((entry) => (
              <option key={entry.name} value={entry.name}>{entry.name}</option>
            ))}
          </select>
          {Array.isArray(cwes) && cwes.length > 0 && (
            <select
              value={cwe ?? ''}
              onChange={(event) => onCweChange(event.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200 focus:border-white/40 focus:outline-none"
            >
              <option value="">All weaknesses</option>
              {cwes.map((entry) => (
                <option key={entry.name} value={entry.name}>{entry.name}</option>
              ))}
            </select>
          )}
          <select
            value={windowDays ?? ''}
            onChange={(event) => {
              const next = event.target.value
              onWindowChange(next ? Number(next) : undefined)
            }}
            className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200 focus:border-white/40 focus:outline-none"
          >
            <option value="">All time</option>
            {WINDOW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>Added: {option.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {SEVERITY_OPTIONS.map((option) => {
          const active = severity === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSeverityChange(active ? '' : option)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active ? 'border-white/70 bg-white/10 text-white' : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-white/40'
              }`}
            >
              {option === 'Known' ? 'Ransomware known' : option === 'Expected' ? 'Faster action' : 'Standard'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
