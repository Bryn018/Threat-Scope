import { useEffect, useMemo, useRef, useState } from 'react'
import { Share2, Search, X, Link2 } from 'lucide-react'

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
      // repulsion
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
      // attraction along edges
      edges.forEach(e => {
        const a = p[e.s], b = p[e.t]
        let dx = a.x - b.x, dy = a.y - b.y
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01
        const f = (d * d) / k
        const fx = (dx / d) * f, fy = (dy / d) * f
        disp[e.s].x -= fx; disp[e.s].y -= fy
        disp[e.t].x += fx; disp[e.t].y += fy
      })
      // gravity to center
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
  const [focus, setFocus] = useState(null) // node id in focus
  const svgRef = useRef(null)

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

  const { nodes, edges, topTech } = useMemo(() => {
    if (!actors.length || !techs.length) return { nodes: [], edges: [], topTech: [] }
    const techSet = new Set(techs.map(t => t.id))
    const edges = []
    const deg = {}
    actors.forEach(a => {
      a.techniques.forEach(tid => {
        if (techSet.has(tid)) { edges.push({ s: a.id, t: tid }); deg[tid] = (deg[tid] || 0) + 1; deg[a.id] = (deg[a.id] || 0) + 1 }
      })
    })
    const actorNodes = actors.map(a => ({ id: a.id, label: a.name, type: 'group', deg: deg[a.id] || 0 }))
    const usedTech = new Set(edges.map(e => e.t))
    const techNodes = techs.filter(t => usedTech.has(t.id)).map(t => ({ id: t.id, label: t.name, type: 'tech', deg: deg[t.id] || 0 }))
    const nodes = [...actorNodes, ...techNodes]
    const topTech = [...techNodes].sort((a, b) => b.deg - a.deg).slice(0, 12)
    return { nodes, edges, topTech }
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><Share2 className="h-6 w-6 text-sky-400" /> Attack Graph</h1>
          <p className="text-sm text-slate-400">Real ATT&CK relationships — {nodes.length ? nodes.length : '…'} nodes, {edges.length} actor→technique edges. Click a node to isolate its neighborhood.</p>
        </div>
      </header>

      {isLoading && <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">Building graph…</div>}
      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">{error}</div>}

      {!isLoading && !error && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Highlight node by name (group or technique)…"
              aria-label="Search graph nodes"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>
          {focus && (
            <button onClick={() => setFocus(null)} className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
              <X className="h-3.5 w-3.5" /> Clear focus {focusNode?.label}
            </button>
          )}
        </div>
      )}

      {!isLoading && !error && topTech.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="col-span-full mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Link2 className="h-3.5 w-3.5" /> Most-targeted techniques (by actor count)
          </div>
          {topTech.map(t => (
            <button key={t.id} onClick={() => setFocus(t.id)}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-left hover:border-slate-700 hover:bg-slate-900/70">
              <span className="truncate text-sm text-slate-200">{t.label}</span>
              <span className="ml-2 shrink-0 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">{t.deg}</span>
            </button>
          ))}
        </div>
      )}

      {!isLoading && !error && nodes.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
          <svg ref={svgRef} viewBox="0 0 960 600" className="h-[600px] w-full" role="img" aria-label="Force-directed attack graph of threat actors and ATT&CK techniques">
            {edges.map((e, i) => {
              const a = pos[e.s], b = pos[e.t]
              if (!a || !b) return null
              const dim = isDim(e.s) || isDim(e.t)
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={dim ? '#1e293b' : '#334155'} strokeWidth={dim ? 0.4 : 0.8} />
            })}
            {nodes.map(n => {
              const p = pos[n.id]
              if (!p) return null
              const dim = isDim(n.id)
              const r = 4 + Math.min(10, Math.sqrt(n.deg) * 1.4)
              const fill = n.type === 'group' ? '#f87171' : '#818cf8'
              return (
                <g key={n.id} transform={`translate(${p.x},${p.y})`} className="cursor-pointer" onClick={() => setFocus(n.id)} opacity={dim ? 0.25 : 1}>
                  <circle r={r} fill={fill} stroke={focus === n.id ? '#e2e8f0' : '#0f172a'} strokeWidth={focus === n.id ? 2 : 1} />
                  {(focus === n.id || (!focus && !q && n.deg > 12)) && (
                    <text x={r + 3} y={3} className="fill-slate-300 text-[9px]">{n.label.length > 22 ? n.label.slice(0, 22) + '…' : n.label}</text>
                  )}
                </g>
              )
            })}
          </svg>
          <div className="flex items-center gap-4 border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Threat actor ({actors.length})</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-400" /> ATT&CK technique ({techs.filter(t => edges.some(e => e.t === t.id)).length})</span>
            <span className="ml-auto">Node size = relationship count</span>
          </div>
        </div>
      )}
    </div>
  )
}
