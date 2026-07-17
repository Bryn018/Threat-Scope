import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft, Tag, User, Crosshair } from 'lucide-react'
import { useGlobalSearch } from '../hooks/useGlobalSearch'

const PAGES = [
  { to: '/', label: 'KEV Dashboard', hint: 'CISA Known Exploited Vulns' },
  { to: '/cves', label: 'CVE Explorer', hint: 'NVD search' },
  { to: '/attack', label: 'ATT&CK Matrix', hint: 'MITRE techniques' },
  { to: '/intel', label: 'Threat Intel', hint: 'CISA advisories & news' },
  { to: '/iocs', label: 'IOC Lookup', hint: 'Hashes, IPs, domains' },
  { to: '/exploits', label: 'Exploit Tracker', hint: 'Exploit-DB' },
  { to: '/exposure', label: 'Tech Exposure', hint: 'Vendor risk matrix' },
  { to: '/actors', label: 'Threat Actors', hint: 'APT groups' },
  { to: '/graph', label: 'Attack Matrix', hint: 'Actor × technique grid' },
  { to: '/watchlist', label: 'Watchlist', hint: 'Alerts & tracking' },
  { to: '/resources', label: 'Resources', hint: 'Tools & references' },
]

const TYPE_ICON = { CVE: Tag, Actor: User, Technique: Crosshair }

export default function CommandPalette({ open, onOpenChange }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const { search } = useGlobalSearch()

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      } else if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  const pages = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PAGES
    return PAGES.filter((p) => p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q))
  }, [query])

  const intel = useMemo(() => (query.trim() ? search(query).slice(0, 8) : []), [query, search])

  const items = useMemo(() => [...pages, ...intel], [pages, intel])

  useEffect(() => {
    if (active >= items.length) setActive(0)
  }, [items, active])

  function choose(item) {
    if (!item) return
    onOpenChange(false)
    navigate(item.to)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-overlay/60 px-4 pt-[12vh]"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border-strong bg-surface-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, items.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                choose(items[active])
              }
            }}
            placeholder="Search CVEs, actors, techniques, or jump to a page…"
            className="w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
          />
          <kbd className="rounded border border-border-strong px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-2">
          {items.length === 0 && <li className="px-4 py-3 text-sm text-muted">No matches</li>}

          {pages.length > 0 && (
            <li className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-faint">
              Pages
            </li>
          )}
          {pages.map((item) => {
            const i = items.indexOf(item)
            return (
              <li key={`p-${item.to}`}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(item)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left ${i === active ? 'bg-sky-500/15' : ''}`}
                >
                  <span className={`text-sm ${i === active ? 'text-accent' : 'text-fg'}`}>{item.label}</span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {item.hint}
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5" />}
                  </span>
                </button>
              </li>
            )
          })}

          {intel.length > 0 && (
            <li className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-faint">
              Intelligence
            </li>
          )}
          {intel.map((item) => {
            const i = items.indexOf(item)
            const Icon = TYPE_ICON[item.type] || Search
            return (
              <li key={`i-${item.type}-${item.id}`}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(item)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left ${i === active ? 'bg-sky-500/15' : ''}`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
                    <span className="min-w-0">
                      <span className={`block truncate text-sm ${i === active ? 'text-accent' : 'text-fg'}`}>
                        {item.label}
                      </span>
                      {item.sub && <span className="block truncate text-xs text-muted">{item.sub}</span>}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                    {item.type}
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5" />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
