// API base URL for the Threat Scope Data Sync Worker
// In production, this points to the Cloudflare Worker
// In development, it can be overridden via Vite env
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://threat-scope-sync.walybewillin.workers.dev'

// API endpoints
export const ENDPOINTS = {
  kev: `${API_BASE}/kev`,
  epss: `${API_BASE}/epss`,
  attackEnterprise: `${API_BASE}/attack-enterprise`,
  techniqueMap: `${API_BASE}/technique-map`,
  attackActors: `${API_BASE}/attack-actors`,
  exploitDb: `${API_BASE}/exploit-db`,
  exploitsByCve: `${API_BASE}/exploits-by-cve`,
  cisaAdvisories: `${API_BASE}/cisa-advisories`,
  cisaNews: `${API_BASE}/cisa-news`,
  kevBaseline: `${API_BASE}/kev-baseline`,
  threatBrief: `${API_BASE}/threat-brief`,
  health: `${API_BASE}/health`,
}
