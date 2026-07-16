/* eslint-disable react-hooks/preserve-manual-memoization -- graph data memo intentionally hand-rolled for the force simulation */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Share2, Search, X, Link2, Maximize2, Eye, EyeOff } from 'lucide-react'

const ACTORS_PATH = '/data/attack-actors.json'
const TECH_PATH = '/data/attack-enterprise.json'

// Compact dependency-free force simulation (Fruchterman–Reingold-ish).
function useForceGraph(nodes, edges, { width = 960, height = 600 } = {}) {
  const [pos, setPos] = useState({})
  const raf = useRef(0)
  const state = useRef({})

  useEffect(() => {
    if (!nodes.length) return
    const W = width, H = height
    const p = {}
    nodes.forEach((n, i) => {
      const a = (i / nodes.length) * Math.PI * 2
      p[n.id] = { x: W / 2 + Math.cos(a) * 220 + (Math.random() - 0.5) * 30, y: H / 2 + Math.sin(a) * 220 + (Math.random() - 0.5) * 30, vx: 0, vy: 0 }
    })
    const adj = {}
    edges.forEach(e => { (adj[e.s] = adj[e.s] || []).push(e.t); (adj[e.t] = adj[e.t] || []).push(e.s) })
    const k = Math.sqrt((W * H) / nodes.length) * 0.6
    let alpha = 1
    const step = () => {
      const disp = {}
      nodes.forEach(n => disp[n.id] = { x: 0, y: 0 })
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = p[nodes[i].id], b = p[nodes[j].id]
          let dx = a.x - b.x, dy = a.y - b.y
          let d2 = dx * dx + dy * dy || 0.01
          const f = (k * k) / d2
          const d = Math.sqrt(d2)
          const fx = (dx / d) * f, fy = (dy / d) * f
          disp[nodes[i].id].x += fx; disp[nodes[i].id].y += fy
          disp[nodes[j].id].x -= fx; disp[nodes[j].id].y -= fy
        }
      }
      edges.forEach(e => {
        const a = p[e.s], b = p[e.t]
        let dx = a.x - b.x, dy = a.y - b.y
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01
        const f = (d * d) / k
        const fx = (dx / d) * f, fy = (dy / d) * f
        disp[e.s].x -= fx; disp[e.s].y -= fy
        disp[e.t].x += fx; disp[e.t].y += fy
      })
      nodes.forEach(n => {
        const c = p[n.id]
        disp[n.id].x += (W / 2 - c.x) * 0.01
        disp[n.id].y += (H / 2 - c.y) * 0.01
      })
      const t = alpha
      nodes.forEach(n => {
        const c = p[n.id], d = disp[n.id]
        const dl = Math.sqrt(d.x * d.x + d.y * d.y) || 0.01
        c.x += (d.x / dl) * Math.min(dl, t * 30)
        c.y += (d.y / dl) * Math.min(dl, t * 30)
        c.x = Math.max(20, Math.min(W - 20, c.x))
        c.y = Math.max(20, Math.min(H - 20, c.y))
      })
      setPos({ ...p })
      alpha *= 0.97
      if (alpha > 0.02) raf.current = requestAnimationFrame(step)
    }
    state.current = p
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [nodes, edges, width, height])

  return pos
}

export default function AttackGraph() {
  const [actors, setActors] = useState([])
  const [techs, setTechs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState(null)
  const [hover, setHover] = useState(null)
  const [showLabels, setShowLabels] = useState(false)
  const [view, setView] = useState({ k: 1, x: 0, y: 0 })
  const svgRef = useRef(null)
  const pan = useRef(null)

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

  const { nodes, edges, topTech, techById, actorById } = useMemo(() => {
    if (!actors.length || !techs.length) return { nodes: [], edges: [], topTech: [], techById: {}, actorById: {} }
    const techSet = new Set(techs.map(t => t.id))
    const edges = []
    const deg = {}
    for (const a of actors) {
      for (const tid of a.techniques) {
        if (!techSet.has(tid)) continue
        edges.push({ s: a.id, t: tid })
        deg[tid] = (deg[tid] || 0) + 1
        deg[a.id] = (deg[a.id] || 0) + 1
      }
    }
    const actorNodes = actors.map(a => ({ id: a.id, label: a.name, type: 'group', deg: deg[a.id] || 0 }))
    const usedTech = new Set(edges.map(e => e.t))
    const techNodes = techs.filter(t => usedTech.has(t.id)).map(t => ({ id: t.id, label: t.name, type: 'tech', deg: deg[t.id] || 0 }))
    const nodes = [...actorNodes, ...techNodes]
    const topTech = [...techNodes].sort((a, b) => b.deg - a.deg).slice(0, 12)
    const techById = Object.fromEntries(techs.map(t => [t.id, t]))
    const actorById = Object.fromEntries(actors.map(a => [a.id, a]))
    return { nodes, edges, topTech, techById, actorById }
  }, [actors, techs])

  const pos = useForceGraph(nodes, edges)

  const q = query.trim().toLowerCase()
  const focusNode = focus ? nodes.find(n => n.id === focus) : null
  const neighborIds = useMemo(() => {
    if (!focus) return null
    const s = new Set([focus])
    edges.forEach(e => { if (e.s === focus) s.add(e.t); if (e.t === focus) s.add(e.s) })
    return s
  }, [focus, edges])

  const isDim = (id) => {
    if (q) return !id.toLowerCase().includes(q) && !(focusNode && focusNode.label.toLowerCase().includes(q))
    if (neighborIds) return !neighborIds.has(id)
    return false
  }

  // Detail panel content for the focused node
  const detail = useMemo(() => {
    if (!focus) return null
    if (focusNode?.type === 'group') {
      const a = actorById[focus]
      const list = (a?.techniques || []).filter(tid => techById[tid]).map(tid => ({ id: tid, label: techById[tid].name }))
      return { kind: 'actor', title: a?.name || focusNode.label, sub: `${list.length} ATT&CK techniques used`, list }
    }
    const t = techById[focus]
    const list = edges.filter(e => e.t === focus).map(e => e.s).map(id => ({ id, label: actorById[id]?.name || id }))
    return { kind: 'tech', title: t?.name || focusNode?.label, sub: `Used by ${list.length} threat actor${list.length === 1 ? '' : 's'}`, list }
  }, [focus, focusNode, actorById, techById, edges])

  // ---- Zoom / pan ----
  const toSvg = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect()
    return { x: ((clientX - rect.left) / rect.width) * 960, y: ((clientY - rect.top) / rect.height) * 600 }
  }
  const onWheel = (e) => {
    e.preventDefault()
    const { x, y } = toSvg(e.clientX, e.clientY)
    setView(v => {
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const k = Math.max(0.4, Math.min(4, v.k * factor))
      return { k, x: x - (x - v.x) * (k / v.k), y: y - (y - v.y) * (k / v.k) }
    })
  }
  const onBgDown = (e) => {
    pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }
  }
  const onBgMove = (e) => {
    if (!pan.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const dx = ((e.clientX - pan.current.x) / rect.width) * 960
    const dy = ((e.clientY - pan.current.y) / rect.height) * 600
    setView(v => ({ ...v, x: pan.current.vx + dx, y: pan.current.vy + dy }))
  }
  const endPan = () => { pan.current = null }

  const resetView = () => setView({ k: 1, x: 0, y: 0 })

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-fg"><Share2 className="h-6 w-6 text-accent" /> Attack Graph</h1>
          <p className="text-sm text-muted">
            Real ATT&CK relationships — {nodes.length ? nodes.length : '…'} nodes, {edges.length} actor→technique links.
            Scroll to zoom, drag to pan, click any node to inspect it.
          </p>
        </div>
      </header>

      {isLoading && <div className="rounded-2xl border border-border bg-surface-2/40 p-8 text-center text-muted">Building graph…</div>}
      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-danger">{error}</div>}

      {!isLoading && !error && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Highlight node by name (group or technique)…"
              aria-label="Search graph nodes"
              className="w-full rounded-xl border border-border bg-surface-2/60 py-2 pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowLabels(s => !s)}
            aria-pressed={showLabels}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong px-3 py-2 text-sm text-muted hover:bg-surface-2"
          >
            {showLabels ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showLabels ? 'Hide labels' : 'Show labels'}
          </button>
          <button
            onClick={resetView}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong px-3 py-2 text-sm text-muted hover:bg-surface-2"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Reset view
          </button>
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

      {!isLoading && !error && nodes.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-bg/60">
          <svg
            ref={svgRef}
            viewBox="0 0 960 600"
            className="h-[600px] w-full touch-none select-none"
            role="group"
            aria-label="Force-directed attack graph of threat actors and ATT&CK techniques"
            onWheel={onWheel}
            onPointerDown={onBgDown}
            onPointerMove={onBgMove}
            onPointerUp={endPan}
            onPointerLeave={endPan}
          >
            <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
              {edges.map((e, i) => {
                const a = pos[e.s], b = pos[e.t]
                if (!a || !b) return null
                const connected = focus && (e.s === focus || e.t === focus)
                const dim = isDim(e.s) || isDim(e.t)
                return (
                  <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={connected ? 'var(--accent)' : 'var(--border-strong)'}
                    strokeWidth={connected ? 1.4 : 0.7}
                    opacity={dim ? 0.08 : (connected ? 0.9 : 0.5)} />
                )
              })}
              {nodes.map(n => {
                const p = pos[n.id]
                if (!p) return null
                const dim = isDim(n.id)
                const r = 4 + Math.min(11, Math.sqrt(n.deg) * 1.5)
                const active = focus === n.id || hover === n.id
                const fill = n.type === 'group' ? 'var(--danger)' : 'var(--attack)'
                const showLabel = active || (showLabels && n.deg > 4) || (!focus && !q && n.deg > 14)
                return (
                  <g key={n.id} transform={`translate(${p.x},${p.y})`}
                    className="cursor-pointer"
                    opacity={dim ? 0.18 : 1}
                    tabIndex={0}
                    role="button"
                    aria-label={`${n.label}, ${n.type === 'group' ? 'threat actor' : 'ATT&CK technique'}, ${n.deg} links`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setFocus(n.id)}
                    onPointerEnter={() => setHover(n.id)}
                    onPointerLeave={() => setHover(h => h === n.id ? null : h)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocus(n.id) } }}
                    onFocus={() => setHover(n.id)}
                    onBlur={() => setHover(null)}
                  >
                    <title>{`${n.label} — ${n.type === 'group' ? 'Threat actor' : 'ATT&CK technique'} · ${n.deg} links`}</title>
                    <circle r={r} fill={fill}
                      stroke={active ? 'var(--fg)' : 'var(--border-strong)'}
                      strokeWidth={active ? 2 : 1} />
                    {showLabel && (
                      <text x={r + 3} y={3}
                        className="pointer-events-none fill-fg text-[9px] font-medium"
                        style={{ paintOrder: 'stroke', stroke: 'var(--bg)', strokeWidth: 2.5 }}>
                        {n.label.length > 26 ? n.label.slice(0, 26) + '…' : n.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger" /> Threat actor ({actors.length})</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-attack" /> ATT&CK technique ({techs.filter(t => edges.some(e => e.t === t.id)).length})</span>
            <span className="ml-auto">Node size = relationship count · scroll to zoom · drag to pan</span>
          </div>
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
