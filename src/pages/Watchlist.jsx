import { useEffect, useMemo, useState } from 'react'
import { Bookmark, BookmarkPlus, Trash2, Bell, Send, Clock, AlertTriangle } from 'lucide-react'

const KEV_PATH = '/data/cisa-kev.json'
const ACTORS_PATH = '/data/attack-actors.json'
const LS_KEY = 'threatscope_watchlist_v1'
const LS_SEEN = 'threatscope_watchlist_seen_v1'

function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* ignore */ }
}

export default function Watchlist() {
  const [items, setItems] = useState([]) // {id, kind:'cve'|'actor', label}
  const [kev, setKev] = useState([])
  const [actors, setActors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [webhook, setWebhook] = useState(loadLS('threatscope_webhook', ''))
  const [webhookMsg, setWebhookMsg] = useState('')
  const [seen, setSeen] = useState(loadLS(LS_SEEN, {})) // id -> dateAdded snapshot
  const [addId, setAddId] = useState('')
  const [addErr, setAddErr] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const [k, a] = await Promise.all([
          fetch(KEV_PATH, { signal: controller.signal }),
          fetch(ACTORS_PATH, { signal: controller.signal }),
        ])
        const K = (await k.json()).vulnerabilities || []
        const A = (await a.json()).actors || []
        if (!controller.signal.aborted) {
          setKev(K); setActors(A)
          setItems(loadLS(LS_KEY, []))
          setSeen(loadLS(LS_SEEN, {}))
        }
      } catch (e) {
        if (e.name !== 'AbortError') setItems(loadLS(LS_KEY, []))
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [])

  const kevById = useMemo(() => Object.fromEntries(kev.map(v => [v.cveID, v])), [kev])
  const actorById = useMemo(() => Object.fromEntries(actors.map(a => [a.id, a])), [actors])

  const enriched = useMemo(() => items.map(it => {
    if (it.kind === 'cve') {
      const v = kevById[it.id]
      const added = v?.dateAdded || null
      const isNew = added && seen[it.id] === undefined && daysAgo(added) <= 30
      return { ...it, live: !!v, added, isNew, extra: v ? `${v.vendorProject} ${v.product}` : 'Not in current KEV' }
    }
    const a = actorById[it.id]
    return { ...it, live: !!a, added: null, isNew: false, extra: a ? `${a.techniques.length} techniques` : 'Not in current ATT&CK' }
  }), [items, kevById, actorById, seen])

  const newCount = enriched.filter(e => e.isNew).length

  function persist(next) { setItems(next); saveLS(LS_KEY, next) }

  function add() {
    setAddErr('')
    const raw = addId.trim()
    if (!raw) return
    const cveMatch = raw.match(/CVE-\d{4}-\d{4,}/i)
    const normId = cveMatch ? cveMatch[0].toUpperCase() : raw
    const isCve = !!cveMatch
    const kind = isCve ? 'cve' : 'actor'
    if (items.some(i => i.id === normId)) { setAddErr('Already on the watchlist.'); return }
    const label = isCve ? normId : (actorById[normId]?.name || normId)
    const next = [{ id: normId, kind, label }, ...items]
    persist(next)
    setAddId('')
  }

  function remove(id) { persist(items.filter(i => i.id !== id)) }

  function markAllSeen() {
    const snap = {}
    enriched.forEach(e => { if (e.added) snap[e.id] = e.added })
    setSeen(snap); saveLS(LS_SEEN, snap)
  }

  async function sendAlert() {
    if (!webhook.trim()) { setWebhookMsg('Enter a webhook URL first.'); return }
    const payload = {
      text: `Threat-Scope watchlist digest (${new Date().toISOString()})`,
      watchlist: enriched.map(e => ({ id: e.id, kind: e.kind, new: e.isNew, status: e.live ? 'active' : 'inactive' })),
    }
    setWebhookMsg('Sending…')
    try {
      await fetch(webhook.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      })
      setWebhookMsg('Alert sent (check your channel).')
    } catch (e) {
      setWebhookMsg('Send failed: ' + e.message)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-fg"><Bookmark className="h-6 w-6 text-accent" /> Watchlist</h1>
          <p className="text-sm text-muted">Track CVEs and threat actors locally. New KEV additions since your last visit are flagged automatically.</p>
        </div>
        {newCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-warning">
            <AlertTriangle className="h-4 w-4" /> {newCount} new since last visit
          </span>
        )}
      </header>

      {isLoading && <div className="rounded-2xl border border-border bg-surface-2/40 p-8 text-center text-muted">Loading watchlist…</div>}

      {!isLoading && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <BookmarkPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text" value={addId} onChange={(e) => setAddId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
                placeholder="Add CVE (e.g. CVE-2024-1234) or actor ID (G####)…"
                aria-label="Add to watchlist"
                className="w-full rounded-xl border border-border bg-surface-2/60 py-2 pl-9 pr-3 text-sm text-fg placeholder-slate-500 focus:border-accent focus:outline-none"
              />
            </div>
            <button onClick={add} className="rounded-xl border border-sky-500/40 bg-accent-soft px-4 py-2 text-sm font-medium text-accent hover:bg-sky-500/20">Add</button>
            {items.length > 0 && (
              <button onClick={markAllSeen} className="rounded-xl border border-border-strong px-3 py-2 text-sm text-muted hover:bg-surface-2">
                <Clock className="mr-1 inline h-3.5 w-3.5" /> Mark all seen
              </button>
            )}
          </div>
          {addErr && <p className="text-xs text-danger">{addErr}</p>}

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/30 p-10 text-center text-muted">
              <Bookmark className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Your watchlist is empty. Add a CVE or threat-actor ID above. Stored only in this browser.
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-2/40">
              {enriched.map(e => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`rounded-md px-2 py-0.5 text-xs ${e.kind === 'cve' ? 'bg-danger-soft text-danger-ink' : 'bg-indigo-100 text-indigo-700'}`}>{e.kind === 'cve' ? 'CVE' : 'ACTOR'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-fg">{e.label}</span>
                      {e.isNew && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-warning">New</span>}
                    </div>
                    <p className="truncate text-xs text-muted">{e.extra}{e.added ? ` · added ${e.added}` : ''}</p>
                  </div>
                  {!e.live && <span className="text-[10px] text-muted">inactive</span>}
                  <button onClick={() => remove(e.id)} aria-label={`Remove ${e.id}`} className="rounded-lg border border-border-strong p-1.5 text-muted hover:bg-surface-2 hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-fg"><Bell className="h-4 w-4 text-accent" /> Optional outbound alert</h2>
            <p className="mb-3 text-xs text-muted">Paste a Slack/Discord/Teams webhook URL. We never store it on a server — it lives in your browser and is only used when you click send.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="url" value={webhook} onChange={(e) => { setWebhook(e.target.value); saveLS('threatscope_webhook', e.target.value) }}
                placeholder="https://hooks.slack.com/services/…"
                aria-label="Webhook URL for alerts"
                className="flex-1 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-sm text-fg placeholder-slate-500 focus:border-accent focus:outline-none"
              />
              <button onClick={sendAlert} className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-accent-soft px-4 py-2 text-sm font-medium text-accent hover:bg-sky-500/20">
                <Send className="h-4 w-4" /> Send digest
              </button>
            </div>
            {webhookMsg && <p className="mt-2 text-xs text-muted">{webhookMsg}</p>}
          </div>
        </>
      )}
    </div>
  )
}

function daysAgo(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  if (isNaN(d)) return 999
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}
