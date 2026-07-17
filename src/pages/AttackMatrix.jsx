import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ExternalLink, Crosshair } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'

// MITRE ATT&CK Enterprise data — mirrored server-side into the site's own
// origin by the sync-threat-feeds workflow (the raw STIX is 50MB+ and is
// CORS-blocked, so we serve a slim curated copy from /data).
const ATTACK_DATA_URL = '/data/attack-enterprise.json'

const TACTIC_ORDER = [
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
]

const TACTIC_NAMES = {
  'reconnaissance': 'Reconnaissance',
  'resource-development': 'Resource Development',
  'initial-access': 'Initial Access',
  'execution': 'Execution',
  'persistence': 'Persistence',
  'privilege-escalation': 'Privilege Escalation',
  'defense-evasion': 'Defense Evasion',
  'credential-access': 'Credential Access',
  'discovery': 'Discovery',
  'lateral-movement': 'Lateral Movement',
  'collection': 'Collection',
  'command-and-control': 'Command and Control',
  'exfiltration': 'Exfiltration',
  'impact': 'Impact',
}

export default function AttackMatrix() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const q = searchParams.get('q')
    if (q != null) setSearchTerm(q)
  }, [searchParams])
  const onSearchChange = (v) => {
    setSearchTerm(v)
    if (v) setSearchParams((p) => { p.set('q', v); return p }, { replace: true })
    else setSearchParams((p) => { p.delete('q'); return p }, { replace: true })
  }
  const [selectedTechnique, setSelectedTechnique] = useState(null)
  const [selectedTactic, setSelectedTactic] = useState('')

  const { data: stixData, isLoading, error } = useFetch(ATTACK_DATA_URL, {
    transform: (raw) => ({ techniques: raw?.techniques || [] }),
    initialData: { techniques: [] },
    ttl: 24 * 60 * 60 * 1000, // Refresh once per day (mirror handles upstream freshness)
  })

  const { techniques } = stixData

  const filteredTechniques = useMemo(() => {
    let result = techniques
    if (selectedTactic) {
      result = result.filter((t) => t.tactics.includes(selectedTactic))
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [techniques, selectedTactic, searchTerm])

  const matrix = useMemo(() => {
    const m = new Map()
    for (const tactic of TACTIC_ORDER) {
      m.set(tactic, [])
    }
    for (const tech of techniques) {
      for (const t of tech.tactics) {
        if (m.has(t)) m.get(t).push(tech)
      }
    }
    return m
  }, [techniques])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">MITRE ATT&CK Matrix</h1>
        <p className="mt-0.5 text-sm text-muted">
          Interactive Enterprise ATT&CK framework — browse techniques by tactic
        </p>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-border bg-surface-2/60 p-8 text-center text-sm text-muted">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Loading ATT&CK data...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/70 bg-danger-soft p-6 text-sm text-danger">
          Error loading ATT&CK data: {error}. The dataset may still be syncing — please refresh shortly.
        </div>
      )}

      {!isLoading && !error && techniques.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-warning">
          ATT&CK data is still loading or could not be fetched. Please try refreshing the page.
        </div>
      )}

      {!isLoading && !error && techniques.length > 0 && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTactic('')}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                !selectedTactic
                  ? 'border-sky-500/70 bg-accent-soft text-accent-ink'
                  : 'border-border-strong bg-surface-2/40 text-muted hover:border-border-strong'
              }`}
            >
              All Tactics ({techniques.length})
            </button>
            {TACTIC_ORDER.map((tactic) => {
              const count = matrix.get(tactic)?.length || 0
              const active = selectedTactic === tactic
              return (
                <button
                  key={tactic}
                  onClick={() => setSelectedTactic(active ? '' : tactic)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'border-sky-500/70 bg-accent-soft text-accent-ink'
                      : 'border-border-strong bg-surface-2/40 text-muted hover:border-border-strong'
                  }`}
                >
                  {TACTIC_NAMES[tactic]} ({count})
                </button>
              )
            })}
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search techniques by ID, name, or keyword..."
                className="w-full rounded-xl border border-border bg-surface-2/60 px-9 py-2.5 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {!selectedTactic && !searchTerm.trim() ? (
            <div className="space-y-4">
              {TACTIC_ORDER.map((tactic) => {
                const techs = matrix.get(tactic) || []
                return (
                  <div key={tactic} className="rounded-xl border border-border bg-surface-2/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-fg">
                          {TACTIC_NAMES[tactic]}
                        </h2>
                        <p className="text-xs text-muted">{techs.length} techniques</p>
                      </div>
                      <button
                        onClick={() => setSelectedTactic(tactic)}
                        className="text-xs text-accent hover:text-accent"
                      >
                        View all →
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {techs.slice(0, 12).map((tech) => (
                        <button
                          key={tech.id}
                          onClick={() => setSelectedTechnique(tech)}
                          className="rounded-md border border-border-strong bg-surface-2/60 px-2 py-1 text-xs text-muted hover:border-sky-500/50 hover:text-fg"
                        >
                          <span className="font-mono font-semibold">{tech.id}</span>{' '}
                          <span className="text-muted">{tech.name}</span>
                        </button>
                      ))}
                      {techs.length > 12 && (
                        <span className="rounded-md border border-border px-2 py-1 text-xs text-muted">
                          +{techs.length - 12} more
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mb-3 text-sm text-muted">
                {filteredTechniques.length} technique{filteredTechniques.length !== 1 ? 's' : ''} found
              </p>
              {filteredTechniques.map((tech) => (
                <div
                  key={tech.id}
                  className="cursor-pointer rounded-xl border border-border bg-surface-2/60 p-4 transition hover:border-border-strong"
                  onClick={() => setSelectedTechnique(tech)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-accent">{tech.id}</span>
                        <span className="text-sm font-medium text-fg">{tech.name}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted line-clamp-2">{(tech.description || '').slice(0, 200)}...</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tech.tactics.map((t) => (
                          <span key={t} className="rounded-full border border-border-strong px-2 py-0.5 text-[10px] text-muted">
                            {TACTIC_NAMES[t] || t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Crosshair className="h-4 w-4 shrink-0 text-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedTechnique && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70 p-4" onClick={() => setSelectedTechnique(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-border-strong bg-surface-2 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-sm font-bold text-accent">{selectedTechnique.id}</p>
                <h3 className="mt-1 text-lg font-semibold text-fg">{selectedTechnique.name}</h3>
              </div>
              <button onClick={() => setSelectedTechnique(null)} className="rounded-md border border-border-strong p-1.5 text-muted hover:text-fg">✕</button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted">Description</h4>
                <p className="mt-1 whitespace-pre-line text-sm text-fg">{selectedTechnique.description}</p>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted">Tactics</h4>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedTechnique.tactics.map((t) => (
                    <span key={t} className="rounded-full border border-attack bg-attack-soft px-2.5 py-0.5 text-xs text-attack-ink">
                      {TACTIC_NAMES[t] || t}
                    </span>
                  ))}
                </div>
              </div>

              {selectedTechnique.platforms?.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted">Platforms</h4>
                  <p className="mt-1 text-sm text-muted">{selectedTechnique.platforms.join(', ')}</p>
                </div>
              )}

              {selectedTechnique.detection && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted">Detection</h4>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted">{selectedTechnique.detection}</p>
                </div>
              )}

              <a
                href={selectedTechnique.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-sky-500/70 bg-accent-soft px-4 py-2 text-sm font-medium text-accent hover:bg-sky-500/20"
              >
                View on MITRE ATT&CK <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
