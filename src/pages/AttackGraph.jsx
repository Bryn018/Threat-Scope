/* eslint-disable react-hooks/preserve-manual-memoization -- data memo intentionally hand-rolled */
import { useEffect, useMemo, useState } from 'react'
import { Share2, Search, X, Link2, Filter, BarChart3 } from 'lucide-react'

import { ENDPOINTS } from '../config/api'

const ACTORS_PATH = ENDPOINTS.attackActors
const TECH_PATH = ENDPOINTS.attackEnterprise

// Canonical ATT&CK enterprise tactic order (used for the tactic filter + labels).
const TACTIC_ORDER = [
  'reconnaissance', 'resource-development', 'initial-access', 'execution',
  'persistence', 'privilege-escalation', 'defense-impairment', 'discovery',
  'lateral-movement', 'collection', 'command-and-control', 'exfiltration',
  'impact', 'stealth', 'credential-access',
]
const TACTIC_LABEL = {
  reconnaissance: 'Reconnaissance', 'resource-development': 'Resource Development', 'initial-access': 'Initial Access',
  execution: 'Execution', persistence: 'Persistence', 'privilege-escalation': 'Privilege Escalation',
  'defense-impairment': 'Defense Impairment', discovery: 'Discovery', 'lateral-movement': 'Lateral Movement',
  collection: 'Collection', 'command-and-control': 'Command and Control', exfiltration: 'Exfiltration',
  impact: 'Impact', stealth: 'Stealth', 'credential-access': 'Credential Access',
}

export default function AttackGraph() {
  const [actors, setActors] = useState([])
  const [techs, setTechs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [tactic, setTactic] = useState('')
  const [focus, setFocus] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const [a, t] = await Promise.all([
          fetch(ACTORS_PATH, { signal: controller.signal }),
          fetch(TECH_PATH, { signal: controller.signal }),
        ])
        if (!a.ok || !t.ok) throw new Error('feed failed')
        const A = (await a.json()).actors || []
        const T = (await t.json()).techniques || []
        if (!controller.signal.aborted) { setActors(A); setTechs(T) }
      } catch (e) {
        if (e.name !== 'AbortError') setError('Failed to load graph data.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [])

  const model = useMemo(() => {
    if (!actors.length || !techs.length) {
      return { techById: {}, actorById: {}, usage: {}, rows: 0, cols: 0, links: 0 }
    }
    const techById = Object.fromEntries(techs.map(t => [t.id, t]))
    const actorById = Object.fromEntries(actors.map(a => [a.id, a]))

    // usage: technique id -> number of actors that use it
    const usage = {}
    let links = 0
    actors.forEach(a => a.techniques.forEach(tid => {
      if (techById[tid]) { usage[tid] = (usage[tid] || 0) + 1; links++ }
    }))

    return {
      techById, actorById, usage,
      rows: actors.length,
      cols: Object.keys(usage).length,
      links,
    }
  }, [actors, techs])

  const { techById, actorById, usage, rows, cols, links } = model

  // Technique leaderboard, ranked by actor count (popularity), then filtered.
  const leaderboard = useMemo(() => {
    const q = query.trim().toLowerCase()
    const tac = tactic
    return Object.keys(usage)
      .map(tid => {
        const t = techById[tid]
        return { id: tid, label: t?.name || tid, deg: usage[tid], tactics: t?.tactics || [] }
      })
      .filter(t => {
        if (tac && !t.tactics.includes(tac)) return false
        if (q && !(t.id.toLowerCase().includes(q) || t.label.toLowerCase().includes(q))) return false
        return true
      })
      .sort((a, b) => b.deg - a.deg || a.id.localeCompare(b.id))
  }, [usage, techById, query, tactic])

  const maxDeg = leaderboard.length ? leaderboard[0].deg : 1

  const focusNode = focus
    ? (actorById[focus] ? { type: 'group', label: actorById[focus].name }
      : techById[focus] ? { type: 'tech', label: techById[focus].name } : null)
    : null

  const detail = useMemo(() => {
    if (!focus) return null
    if (actorById[focus]) {
      const a = actorById[focus]
      const list = (a.techniques || []).filter(tid => techById[tid]).map(tid => ({ id: tid, label: techById[tid].name }))
      return { kind: 'actor', title: a.name, sub: `${list.length} ATT&CK techniques used`, list }
    }
    const t = techById[focus]
    const list = rows ? Object.values(actorById).filter(a => a.techniques.includes(focus)).map(a => ({ id: a.id, label: a.name })) : []
    return { kind: 'tech', title: t.name, sub: `Used by ${list.length} threat actor${list.length === 1 ? '' : 's'}`, list }
  }, [focus, actorById, techById, rows])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-fg"><Share2 className="h-6 w-6 text-accent" /> Attack Matrix</h1>
          <p className="text-sm text-muted">
            Ranked ATT&CK techniques by how many tracked threat actors use them. The higher the bar, the more
            prevalent the technique across the adversary landscape. Click any technique to see the actors using it.
          </p>
        </div>
      </header>

      {isLoading && <div className="rounded-2xl border border-border bg-surface-2/40 p-8 text-center text-muted">Building matrix…</div>}
      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-danger">{error}</div>}

      {!isLoading && !error && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter techniques by ID or name…"
              aria-label="Filter techniques"
              className="w-full rounded-xl border border-border bg-surface-2/60 py-2 pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>
          <select
            value={tactic} onChange={(e) => setTactic(e.target.value)}
            aria-label="Filter by tactic"
            className="rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          >
            <option value="">All tactics</option>
            {TACTIC_ORDER.map(t => <option key={t} value={t}>{TACTIC_LABEL[t] || t}</option>)}
          </select>
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong px-3 py-2 text-sm text-muted">
            <Filter className="h-3.5 w-3.5" /> {rows} actors · {cols} techniques · {links} links
          </div>
          {focus && (
            <button onClick={() => setFocus(null)} className="inline-flex items-center gap-1 rounded-xl border border-border-strong px-3 py-2 text-sm text-muted hover:bg-surface-2">
              <X className="h-3.5 w-3.5" /> Clear ({focusNode?.label})
            </button>
          )}
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-full mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <BarChart3 className="h-3.5 w-3.5" /> Technique leaderboard — by actor count
          </div>
          {leaderboard.slice(0, 40).map(t => (
            <button
              key={t.id}
              onClick={() => setFocus(t.id)}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/40 px-3 py-2 text-left hover:border-border-strong hover:bg-surface-2/70"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-accent">{t.id}</span>
                  <span className="truncate text-sm text-fg">{t.label}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-danger"
                    style={{ width: `${Math.max(4, Math.round(100 * t.deg / maxDeg))}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-attack-soft px-2 py-0.5 text-xs text-attack-ink">{t.deg}</span>
            </button>
          ))}
          {leaderboard.length === 0 && (
            <p className="col-span-full text-sm text-faint">No techniques match your filter.</p>
          )}
        </div>
      )}

      {!isLoading && !error && leaderboard.length > 40 && (
        <p className="text-xs text-muted">
          Showing top 40 of {leaderboard.length} techniques. Use the search/filter to narrow the list.
        </p>
      )}

      {!isLoading && !error && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-attack" /> ATT&CK technique</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger" /> Threat actor</span>
          <span className="ml-auto">Bar length = number of tracked actors using the technique</span>
        </div>
      )}

      {!isLoading && !error && detail && (
        <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${detail.kind === 'actor' ? 'bg-danger' : 'bg-attack'}`} />
                <h2 className="text-lg font-semibold text-fg">{detail.title}</h2>
              </div>
              <p className="mt-0.5 text-sm text-muted">{detail.sub}</p>
            </div>
            <button onClick={() => setFocus(null)} aria-label="Close details"
              className="rounded-lg border border-border-strong p-1.5 text-muted hover:bg-surface-2">
              <X className="h-4 w-4" />
            </button>
          </div>
          {detail.list.length > 0 ? (
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {detail.list.map(item => (
                <li key={item.id}>
                  <button onClick={() => setFocus(item.id)}
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left text-sm text-fg hover:border-accent hover:bg-surface-2">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-faint">No linked {detail.kind === 'actor' ? 'techniques' : 'actors'} in the current dataset.</p>
          )}
          {detail.kind === 'tech' && techById[focus] && (
            <a href={`https://attack.mitre.org/techniques/${focus}/`} target="_blank" rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline">
              Open in MITRE ATT&CK <Link2 className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
