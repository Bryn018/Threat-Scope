/* eslint-disable react-hooks/preserve-manual-memoization -- data memo intentionally hand-rolled */
import { useEffect, useMemo, useState } from 'react'
import { Share2, Search, X, Link2, Filter } from 'lucide-react'

import { ENDPOINTS } from '../config/api'

const ACTORS_PATH = ENDPOINTS.attackActors
const TECH_PATH = ENDPOINTS.attackEnterprise

// Canonical ATT&CK enterprise tactic order (lays out the matrix columns left→right).
const TACTIC_ORDER = [
  'reconnaissance', 'resource-development', 'initial-access', 'execution',
  'persistence', 'privilege-escalation', 'defense-impairment', 'discovery',
  'lateral-movement', 'collection', 'command-and-control', 'exfiltration',
  'impact', 'stealth', 'credential-access',
]
const TACTIC_LABEL = {
  reconnaissance: 'Recon', 'resource-development': 'Resource Dev', 'initial-access': 'Initial Access',
  execution: 'Execution', persistence: 'Persistence', 'privilege-escalation': 'Priv. Esc.',
  'defense-impairment': 'Defense Impair', discovery: 'Discovery', 'lateral-movement': 'Lateral Move',
  collection: 'Collection', 'command-and-control': 'C2', exfiltration: 'Exfil', impact: 'Impact',
  stealth: 'Stealth', 'credential-access': 'Credential Access',
}

export default function AttackGraph() {
  const [actors, setActors] = useState([])
  const [techs, setTechs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState(null)
  const [hover, setHover] = useState(null) // { type: 'row' | 'col', id }

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
      return { rows: [], cols: [], colGroups: [], edgeSet: new Set(), maxDeg: 1, topTech: [], techById: {}, actorById: {}, techDeg: {} }
    }
    const techById = Object.fromEntries(techs.map(t => [t.id, t]))
    const actorById = Object.fromEntries(actors.map(a => [a.id, a]))

    const actorDeg = {}, techDeg = {}
    actors.forEach(a => a.techniques.forEach(tid => {
      if (techById[tid]) { actorDeg[a.id] = (actorDeg[a.id] || 0) + 1; techDeg[tid] = (techDeg[tid] || 0) + 1 }
    }))
    const maxDeg = Math.max(1, ...Object.values(techDeg))

    const rows = actors
      .filter(a => (actorDeg[a.id] || 0) > 0)
      .map(a => ({ id: a.id, label: a.name, deg: actorDeg[a.id] || 0 }))
      .sort((a, b) => b.deg - a.deg)

    // columns: techniques used by >=1 actor, grouped by tactic, sorted by popularity within group
    const grouped = {}
    const used = new Set(rows.flatMap(r => actorById[r.id].techniques.filter(t => techById[t])))
    used.forEach(tid => {
      const t = techById[tid]
      const tac = (t.tactics && t.tactics[0]) || 'execution'
      ;(grouped[tac] = grouped[tac] || []).push({ id: tid, label: t.name, deg: techDeg[tid] || 0 })
    })
    const colGroups = TACTIC_ORDER.filter(tc => grouped[tc]).map(tac => ({
      tac,
      label: TACTIC_LABEL[tac] || tac,
      items: grouped[tac].sort((a, b) => b.deg - a.deg),
    }))
    const cols = colGroups.flatMap(g => g.items)
    const edgeSet = new Set()
    rows.forEach(r => actorById[r.id].techniques.forEach(tid => {
      if (techById[tid]) edgeSet.add(r.id + '|' + tid)
    }))
    const topTech = [...cols].sort((a, b) => b.deg - a.deg).slice(0, 12)
    return { rows, cols, colGroups, edgeSet, maxDeg, topTech, techById, actorById, techDeg }
  }, [actors, techs])

  const { rows, cols, colGroups, edgeSet, maxDeg, topTech, techById, actorById, techDeg } = model

  const q = query.trim().toLowerCase()
  const visibleRows = useMemo(() => q ? rows.filter(r => r.label.toLowerCase().includes(q)) : rows, [rows, q])
  const rowIndex = useMemo(() => Object.fromEntries(visibleRows.map((r, i) => [r.id, i])), [visibleRows])
  const colIndex = useMemo(() => Object.fromEntries(cols.map((c, i) => [c.id, i])), [cols])

  const focusNode = focus ? (actorById[focus] ? { type: 'group', label: actorById[focus].name }
    : techById[focus] ? { type: 'tech', label: techById[focus].name } : null) : null

  const detail = useMemo(() => {
    if (!focus) return null
    if (actorById[focus]) {
      const a = actorById[focus]
      const list = (a.techniques || []).filter(tid => techById[tid]).map(tid => ({ id: tid, label: techById[tid].name }))
      return { kind: 'actor', title: a.name, sub: `${list.length} ATT&CK techniques used`, list }
    }
    const t = techById[focus]
    const list = rows.filter(r => actorById[r.id].techniques.includes(focus)).map(r => ({ id: r.id, label: r.label }))
    return { kind: 'tech', title: t.name, sub: `Used by ${list.length} threat actor${list.length === 1 ? '' : 's'}`, list }
  }, [focus, actorById, techById, rows])

  // hover takes precedence over focus for highlighting
  const hl = hover || (focus ? { type: focusNode?.type === 'group' ? 'row' : 'col', id: focus } : null)
  const isDim = (actorId, techId) => {
    if (!hl) return false
    return hl.type === 'row' ? actorId !== hl.id : techId !== hl.id
  }

  // layout constants
  const CELL = 13, GAP = 1, GUTTER = 200, HEAD = 78, FOOT = 8
  const W = GUTTER + cols.length * CELL
  const H = HEAD + visibleRows.length * CELL + FOOT

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-fg"><Share2 className="h-6 w-6 text-accent" /> Attack Matrix</h1>
          <p className="text-sm text-muted">
            Every lit cell = a threat actor uses that ATT&CK technique. Rows are actors, columns are techniques grouped by
            kill-chain phase. Hover or click any row or column to inspect it.
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
              placeholder="Filter actors by name…"
              aria-label="Filter actors"
              className="w-full rounded-xl border border-border bg-surface-2/60 py-2 pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong px-3 py-2 text-sm text-muted">
            <Filter className="h-3.5 w-3.5" /> {rows.length} actors · {cols.length} techniques · {edgeSet.size} links
          </div>
          {focus && (
            <button onClick={() => setFocus(null)} className="inline-flex items-center gap-1 rounded-xl border border-border-strong px-3 py-2 text-sm text-muted hover:bg-surface-2">
              <X className="h-3.5 w-3.5" /> Clear ({focusNode?.label})
            </button>
          )}
        </div>
      )}

      {!isLoading && !error && topTech.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="col-span-full mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <Link2 className="h-3.5 w-3.5" /> Most-targeted techniques (by actor count)
          </div>
          {topTech.map(t => (
            <button key={t.id} onClick={() => setFocus(t.id)}
              className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-3 py-2 text-left hover:border-border-strong hover:bg-surface-2/70">
              <span className="truncate text-sm text-fg">{t.label}</span>
              <span className="ml-2 shrink-0 rounded-full bg-attack-soft px-2 py-0.5 text-xs text-attack-ink">{t.deg}</span>
            </button>
          ))}
        </div>
      )}

      {!isLoading && !error && cols.length > 0 && (
        <div className="overflow-auto rounded-2xl border border-border bg-bg/60 attack-matrix" style={{ maxHeight: '70vh' }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W} height={H}
            className="block"
            role="group"
            aria-label="Adjacency matrix of threat actors (rows) and ATT&CK techniques (columns)"
          >
            {/* tactic group separators + labels */}
            {colGroups.map(g => {
              const gStartCol = cols.findIndex(c => c.id === g.items[0].id)
              return (
                <g key={g.tac}>
                  <line x1={GUTTER + gStartCol * CELL} y1={0} x2={GUTTER + gStartCol * CELL} y2={H} stroke="var(--border-strong)" strokeWidth={1} opacity={0.55} />
                  <text x={GUTTER + gStartCol * CELL + CELL / 2} y={12} textAnchor="middle" className="fill-faint text-[9px] font-semibold uppercase tracking-wide">{g.label}</text>
                </g>
              )
            })}

            {/* cells: only the lit (linked) ones are drawn */}
            {visibleRows.map(r => (
              <g key={r.id} opacity={hl && hl.type === 'row' && hl.id !== r.id ? 0.1 : 1}>
                {actorById[r.id].techniques.map(tid => {
                  const ci = colIndex[tid]
                  if (ci == null) return null
                  const dim = isDim(r.id, tid)
                  const intensity = 0.3 + 0.7 * (techDeg[tid] / maxDeg)
                  return (
                    <rect
                      key={tid}
                      x={GUTTER + ci * CELL} y={HEAD + (rowIndex[r.id] || 0) * CELL}
                      width={CELL - GAP} height={CELL - GAP} rx={2}
                      fill="var(--accent)"
                      opacity={dim ? 0.04 : intensity}
                      className="cursor-pointer"
                      onClick={() => setFocus(r.id)}
                      onMouseEnter={() => setHover({ type: 'row', id: r.id })}
                      onMouseLeave={() => setHover(null)}
                    >
                      <title>{`${r.label} → ${techById[tid]?.name}`}</title>
                    </rect>
                  )
                })}
              </g>
            ))}

            {/* column headers (technique IDs), grouped by tactic */}
            {colGroups.map(g => {
              const gStartCol = cols.findIndex(c => c.id === g.items[0].id)
              return (
                <g key={g.tac + '-h'}>
                  {g.items.map((it, i) => {
                    const ci = gStartCol + i
                    const cx = GUTTER + ci * CELL + CELL / 2
                    return (
                      <g key={it.id}
                        opacity={hl && hl.type === 'col' && hl.id !== it.id ? 0.18 : 1}
                        className="cursor-pointer"
                        onClick={() => setFocus(it.id)}
                        onMouseEnter={() => setHover({ type: 'col', id: it.id })}
                        onMouseLeave={() => setHover(null)}
                      >
                        <rect x={GUTTER + ci * CELL} y={0} width={CELL} height={HEAD} fill="transparent" />
                        <text x={cx} y={HEAD - 6} transform={`rotate(-90 ${cx} ${HEAD - 6})`} textAnchor="start"
                          className="fill-muted text-[9px] font-medium">{it.id}</text>
                        <title>{`${it.label} — used by ${it.deg} actors`}</title>
                      </g>
                    )
                  })}
                </g>
              )
            })}

            {/* row headers (actor names) */}
            {visibleRows.map(r => (
              <g key={r.id}
                opacity={hl && hl.type === 'row' && hl.id !== r.id ? 0.18 : 1}
                className="cursor-pointer"
                onClick={() => setFocus(r.id)}
                onMouseEnter={() => setHover({ type: 'row', id: r.id })}
                onMouseLeave={() => setHover(null)}
              >
                <rect x={0} y={HEAD + (rowIndex[r.id] || 0) * CELL} width={GUTTER - 6} height={CELL} fill="transparent" />
                <text x={GUTTER - 10} y={HEAD + (rowIndex[r.id] || 0) * CELL + CELL / 2 + 3} textAnchor="end" className="fill-fg text-[10px]">{r.label.length > 26 ? r.label.slice(0, 26) + '…' : r.label}</text>
                <title>{`${r.label} — ${r.deg} techniques`}</title>
              </g>
            ))}
          </svg>
        </div>
      )}

      {!isLoading && !error && cols.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-accent" /> Actor uses technique</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger" /> Threat actor (row)</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-attack" /> ATT&CK technique (column)</span>
          <span className="ml-auto">Cell brightness = how many actors use that technique</span>
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
