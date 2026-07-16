import { useEffect, useMemo, useState } from 'react'
import { Users, Search, Crosshair, Bug, Wrench, ExternalLink, ArrowLeft, ShieldHalf, Skull } from 'lucide-react'

const ACTORS_PATH = '/data/attack-actors.json'

function StatPill({ icon: Icon, label, value, tone = 'text-muted' }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/40 px-3 py-2">
      <Icon className={`h-4 w-4 ${tone}`} />
      <div className="leading-tight">
        <div className="text-xs text-muted">{label}</div>
        <div className={`text-sm font-semibold ${tone}`}>{value}</div>
      </div>
    </div>
  )
}

function ActorCard({ actor, onSelect, active }) {
  return (
    <button
      onClick={() => onSelect(actor)}
      aria-label={`Open ${actor.name} profile`}
      className={`group flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition
        ${active ? 'border-sky-500/70 bg-sky-500/5' : 'border-border bg-surface-2/40 hover:border-border-strong hover:bg-surface-2/70'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-fg group-hover:text-fg">{actor.name}</h3>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted group-hover:text-accent" />
      </div>
      {actor.aliases?.length > 1 && (
        <p className="text-xs text-muted line-clamp-1">{actor.aliases.slice(1).join(', ')}</p>
      )}
      <div className="mt-1 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
          <Crosshair className="h-3 w-3" /> {actor.techniques.length}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs text-danger">
          <Bug className="h-3 w-3" /> {actor.malware.length}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-xs text-ok">
          <Wrench className="h-3 w-3" /> {actor.tools.length}
        </span>
      </div>
    </button>
  )
}

export default function ThreatActors() {
  const [actors, setActors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('techniques')
  const [selected, setSelected] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const res = await fetch(ACTORS_PATH, { signal: controller.signal })
        if (!res.ok) throw new Error('Actor feed failed')
        const data = await res.json()
        if (!controller.signal.aborted) {
          setActors(data.actors || [])
          setLastUpdated(new Date())
        }
      } catch (e) {
        if (e.name !== 'AbortError') setError('Failed to load threat-actor data.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = actors
    if (q) {
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.aliases || []).some(al => al.toLowerCase().includes(q)) ||
        a.techniques.some(t => t.toLowerCase().includes(q)) ||
        a.malware.some(m => m.toLowerCase().includes(q)) ||
        a.tools.some(t => t.toLowerCase().includes(q))
      )
    }
    const sorters = {
      techniques: (a, b) => b.techniques.length - a.techniques.length,
      malware: (a, b) => b.malware.length - a.malware.length,
      tools: (a, b) => b.tools.length - a.tools.length,
      name: (a, b) => a.name.localeCompare(b.name),
    }
    return [...list].sort(sorters[sortKey] || sorters.techniques)
  }, [actors, query, sortKey])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Threat Actors</h1>
          <p className="text-sm text-muted">
            MITRE ATT&CK tracked adversaries — real group→technique, malware & tool relationships.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill icon={Users} label="Tracked actors" value={actors.length} tone="text-accent" />
          <StatPill icon={Crosshair} label="w/ techniques" value={actors.filter(a => a.techniques.length).length} tone="text-indigo-700" />
          <StatPill icon={Skull} label="w/ malware" value={actors.filter(a => a.malware.length).length} tone="text-danger" />
        </div>
      </header>

      {isLoading && <div className="rounded-2xl border border-border bg-surface-2/40 p-8 text-center text-muted">Loading adversaries…</div>}
      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-danger">{error}</div>}

      {!isLoading && !error && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, alias, technique (T####), malware or tool…"
              aria-label="Search threat actors"
              className="w-full rounded-xl border border-border bg-surface-2/60 py-2 pl-9 pr-3 text-sm text-fg placeholder-slate-500 focus:border-accent focus:outline-none"
            />
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            aria-label="Sort actors by"
            className="rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          >
            <option value="techniques">Most techniques</option>
            <option value="malware">Most malware</option>
            <option value="tools">Most tools</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>
      )}

      {!isLoading && !error && selected && (
        <div className="rounded-2xl border border-sky-500/30 bg-surface-2/60 p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-fg">
                <ShieldHalf className="h-5 w-5 text-accent" /> {selected.name}
              </h2>
              {selected.aliases?.length > 1 && (
                <p className="text-xs text-muted">{selected.aliases.slice(1).join(', ')}</p>
              )}
            </div>
            <button onClick={() => setSelected(null)} aria-label="Close profile" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-muted hover:bg-surface-2">
              <ArrowLeft className="mr-1 inline h-3.5 w-3.5" /> Back
            </button>
          </div>
          {selected.url && (
            <a href={selected.url} target="_blank" rel="noopener noreferrer"
               className="mb-4 inline-flex items-center gap-1 text-xs text-accent hover:underline">
              MITRE ATT&CK profile <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {selected.description && (
            <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted">{selected.description}</p>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <Section icon={Crosshair} title="Techniques" tone="text-indigo-700" items={selected.techniques} empty="No mapped techniques" href={(t) => `https://attack.mitre.org/techniques/${t}/`} />
            <Section icon={Bug} title="Malware" tone="text-danger" items={selected.malware} empty="No known malware" />
            <Section icon={Wrench} title="Tools" tone="text-ok" items={selected.tools} empty="No known tools" />
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((a) => (
            <ActorCard key={a.id} actor={a} active={selected?.id === a.id} onSelect={setSelected} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-border bg-surface-2/40 p-8 text-center text-muted">No actors match “{query}”.</div>
          )}
        </div>
      )}

      {lastUpdated && (
        <p className="text-xs text-muted">Auto-synced from MITRE ATT&CK · {lastUpdated.toLocaleTimeString()}</p>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, tone, items, empty, href }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-3">
      <h3 className={`mb-2 flex items-center gap-1.5 text-sm font-semibold ${tone}`}>
        <Icon className="h-4 w-4" /> {title} <span className="text-muted">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((it) => (
            <li key={it}>
              {href ? (
                <a href={href(it)} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 rounded-md bg-surface-2/60 px-2 py-0.5 text-xs text-muted hover:bg-surface-2 hover:text-fg">
                  {it}
                </a>
              ) : (
                <span className="inline-block rounded-md bg-surface-2/60 px-2 py-0.5 text-xs text-muted">{it}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
