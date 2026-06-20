import { useState, useMemo } from 'react'
import { Search, ExternalLink, Crosshair } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'

// Use the ATT&CK STIX data from the official MITRE GitHub — but the techniques-only subset
// This is much smaller than the full enterprise-attack.json (~50MB)
// We use the attack-flow-data repo which has a pre-processed techniques JSON
const ATTACK_TECHNIQUES_URL = 'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/attack-pattern--b81c809b-d824-46b3-8221-6390b6e4f8b5.json'

// Instead, let's use the official ATT&CK GitHub repo's structured data
// The attack-stix-data repo has individual files per object — too many requests
// Better approach: use a pre-built JSON from a CDN or the ATT&CK website's own data
// Actually the best free approach: use the ATT&CK STIX via a CORS-friendly CDN
const ATTACK_DATA_URL = 'https://cdn.jsdelivr.net/gh/mitre-attack/attack-stix-data@master/enterprise-attack/enterprise-attack.json'

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
  const [selectedTechnique, setSelectedTechnique] = useState(null)
  const [selectedTactic, setSelectedTactic] = useState('')

  const { data: stixData, isLoading, error } = useFetch(ATTACK_DATA_URL, {
    transform: (raw) => {
      if (!raw?.objects) return { techniques: [], tacticNames: TACTIC_NAMES }
      const techniques = []

      for (const obj of raw.objects) {
        if (obj.type === 'attack-pattern' && !obj.x_mitre_is_subtechnique && obj.revoked !== true && !obj.x_mitre_deprecated) {
          const tacticShortnames = (obj.kill_chain_phases || [])
            .filter((p) => p.kill_chain_name === 'mitre-attack')
            .map((p) => p.phase_name)

          techniques.push({
            id: obj.external_references?.[0]?.external_id || '—',
            name: obj.name,
            description: (obj.description || '').slice(0, 500),
            tactics: tacticShortnames,
            url: obj.external_references?.[0]?.url || '#',
            platforms: obj.x_mitre_platforms || [],
            detection: (obj.x_mitre_detection || '').slice(0, 500),
          })
        }
      }

      return { techniques, tacticNames: TACTIC_NAMES }
    },
    initialData: { techniques: [], tacticNames: TACTIC_NAMES },
    ttl: 60 * 60 * 1000, // Cache for 1 hour — STIX data changes rarely
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
          t.description.toLowerCase().includes(q)
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
        <h1 className="text-2xl font-bold text-white">MITRE ATT&CK Matrix</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Interactive Enterprise ATT&CK framework — browse techniques by tactic
        </p>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-300">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          Loading ATT&CK data from MITRE GitHub... This may take a moment.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/70 bg-red-500/10 p-6 text-sm text-red-200">
          Error loading ATT&CK data: {error}. The MITRE GitHub may be temporarily unavailable.
        </div>
      )}

      {!isLoading && !error && techniques.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-amber-300">
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
                  ? 'border-sky-500/70 bg-sky-500/10 text-sky-300'
                  : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500'
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
                      ? 'border-sky-500/70 bg-sky-500/10 text-sky-300'
                      : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {TACTIC_NAMES[tactic]} ({count})
                </button>
              )
            })}
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search techniques by ID, name, or keyword..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-9 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {!selectedTactic && !searchTerm.trim() ? (
            <div className="space-y-4">
              {TACTIC_ORDER.map((tactic) => {
                const techs = matrix.get(tactic) || []
                return (
                  <div key={tactic} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-white">
                          {TACTIC_NAMES[tactic]}
                        </h2>
                        <p className="text-xs text-slate-500">{techs.length} techniques</p>
                      </div>
                      <button
                        onClick={() => setSelectedTactic(tactic)}
                        className="text-xs text-sky-400 hover:text-sky-300"
                      >
                        View all →
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {techs.slice(0, 12).map((tech) => (
                        <button
                          key={tech.id}
                          onClick={() => setSelectedTechnique(tech)}
                          className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs text-slate-300 hover:border-sky-500/50 hover:text-white"
                        >
                          <span className="font-mono font-semibold">{tech.id}</span>{' '}
                          <span className="text-slate-400">{tech.name}</span>
                        </button>
                      ))}
                      {techs.length > 12 && (
                        <span className="rounded-md border border-slate-800 px-2 py-1 text-xs text-slate-500">
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
              <p className="mb-3 text-sm text-slate-400">
                {filteredTechniques.length} technique{filteredTechniques.length !== 1 ? 's' : ''} found
              </p>
              {filteredTechniques.map((tech) => (
                <div
                  key={tech.id}
                  className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-600"
                  onClick={() => setSelectedTechnique(tech)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-sky-400">{tech.id}</span>
                        <span className="text-sm font-medium text-white">{tech.name}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">{tech.description.slice(0, 200)}...</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tech.tactics.map((t) => (
                          <span key={t} className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                            {TACTIC_NAMES[t] || t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Crosshair className="h-4 w-4 shrink-0 text-slate-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedTechnique && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedTechnique(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-sm font-bold text-sky-400">{selectedTechnique.id}</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{selectedTechnique.name}</h3>
              </div>
              <button onClick={() => setSelectedTechnique(null)} className="rounded-md border border-slate-700 p-1.5 text-slate-300 hover:text-white">✕</button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <h4 className="text-xs uppercase tracking-wider text-slate-500">Description</h4>
                <p className="mt-1 text-sm text-slate-200 whitespace-pre-line">{selectedTechnique.description}</p>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wider text-slate-500">Tactics</h4>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedTechnique.tactics.map((t) => (
                    <span key={t} className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-xs text-violet-300">
                      {TACTIC_NAMES[t] || t}
                    </span>
                  ))}
                </div>
              </div>

              {selectedTechnique.platforms?.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-slate-500">Platforms</h4>
                  <p className="mt-1 text-sm text-slate-300">{selectedTechnique.platforms.join(', ')}</p>
                </div>
              )}

              {selectedTechnique.detection && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-slate-500">Detection</h4>
                  <p className="mt-1 text-sm text-slate-300 whitespace-pre-line">{selectedTechnique.detection}</p>
                </div>
              )}

              <a
                href={selectedTechnique.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-sky-500/70 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20"
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
