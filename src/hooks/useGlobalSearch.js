import { useEffect, useState } from 'react'

import { ENDPOINTS } from '../config/api'

const KEV_PATH = ENDPOINTS.kev
const ACTORS_PATH = ENDPOINTS.attackActors
const TECH_PATH = ENDPOINTS.attackEnterprise

// Module-level cache so repeated palette opens don't refetch the datasets.
let _indexPromise = null

async function loadIndex() {
  if (_indexPromise) return _indexPromise
  _indexPromise = (async () => {
    const [kev, actors, tech] = await Promise.all([
      fetch(KEV_PATH).then((r) => r.json()),
      fetch(ACTORS_PATH).then((r) => r.json()),
      fetch(TECH_PATH).then((r) => r.json()),
    ])

    const kevArr = kev.vulnerabilities || kev.kev || kev || []
    const actorArr = actors.actors || actors || []
    const techArr = tech.techniques || tech || []

    /** @type {Array<{type:string,id:string,label:string,sub:string,to:string}>} */
    const idx = []

    for (const v of kevArr) {
      const cve = v.cveID || v.cve
      if (!cve) continue
      idx.push({
        type: 'CVE',
        id: cve,
        label: cve,
        sub: `${v.vendorProject || ''} ${v.product || ''}`.trim() || v.vulnerabilityName || '',
        to: `/?q=${encodeURIComponent(cve)}`,
      })
    }
    for (const a of actorArr) {
      const aliases = (a.aliases || []).join(', ')
      idx.push({
        type: 'Actor',
        id: a.id,
        label: a.name,
        sub: aliases || 'Threat actor',
        to: `/actors?q=${encodeURIComponent(a.name)}`,
      })
    }
    for (const t of techArr) {
      idx.push({
        type: 'Technique',
        id: t.id,
        label: `${t.id} ${t.name}`,
        sub: (t.tactics || []).join(', '),
        to: `/attack?q=${encodeURIComponent(t.name)}`,
      })
    }
    return idx
  })()
  return _indexPromise
}

/**
 * Cross-entity search over the real local datasets (KEV + actors + techniques).
 * Returns matched intelligence entities; the static page list is handled by the
 * caller (CommandPalette) so the two can be rendered as separate groups.
 */
export function useGlobalSearch() {
  const [index, setIndex] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    if (!_indexPromise) setLoading(true)
    loadIndex()
      .then((i) => {
        if (alive) {
          setIndex(i)
          setLoading(false)
        }
      })
      .catch(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const search = (raw) => {
    if (!index) return []
    const q = raw.trim().toLowerCase()
    if (!q) return []
    const scored = []
    for (const e of index) {
      const label = e.label.toLowerCase()
      const sub = (e.sub || '').toLowerCase()
      const id = e.id.toLowerCase()
      let rank = -1
      if (label.startsWith(q) || id.startsWith(q)) rank = 0
      else if (label.includes(q)) rank = 1
      else if (sub.includes(q)) rank = 2
      if (rank >= 0) scored.push({ e, rank })
    }
    scored.sort((a, b) => a.rank - b.rank || a.e.label.localeCompare(b.e.label))
    return scored.slice(0, 18).map((s) => s.e)
  }

  return { index, loading, search }
}
