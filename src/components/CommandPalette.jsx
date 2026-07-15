import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft } from 'lucide-react'

const PAGES = [
  { to: '/', label: 'KEV Dashboard', hint: 'CISA Known Exploited Vulns' },
  { to: '/cves', label: 'CVE Explorer', hint: 'NVD search' },
  { to: '/attack', label: 'ATT&CK Matrix', hint: 'MITRE techniques' },
  { to: '/intel', label: 'Threat Intel', hint: 'CISA advisories & news' },
  { to: '/iocs', label: 'IOC Lookup', hint: 'Hashes, IPs, domains' },
  { to: '/exploits', label: 'Exploit Tracker', hint: 'Exploit-DB' },
  { to: '/exposure', label: 'Tech Exposure', hint: 'Vendor risk matrix' },
  { to: '/resources', label: 'Resources', hint: 'Tools & references' },
]

export default function CommandPalette({ open, onOpenChange }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef(null)

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PAGES
    return PAGES.filter((p) => p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    if (active >= results.length) setActive(0)
  }, [results, active])

  function choose(item) {
    if (!item) return
    onOpenChange(false)
    navigate(item.to)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
              else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]) }
            }}
            placeholder="Jump to a page…"
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">ESC</kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto py-2">
          {results.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-400">No matches</li>
          )}
          {results.map((item, i) => (
            <li key={item.to}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(item)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left ${i === active ? 'bg-sky-500/15' : ''}`}
              >
                <span className={`text-sm ${i === active ? 'text-sky-200' : 'text-slate-200'}`}>{item.label}</span>
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  {item.hint}
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5" />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
