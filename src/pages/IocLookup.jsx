import { useState } from 'react'
import { Search, AlertTriangle, CheckCircle, XCircle, Info, Shield, Globe, Hash } from 'lucide-react'

const ABUSEIPDB_API = 'https://api.abuseipdb.com/api/v2/check'
const VIRUSTOTAL_UI_BASE = 'https://www.virustotal.com/gui'

function detectIocType(value) {
  const trimmed = value.trim()
  // IPv4
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) return 'ip'
  // IPv6
  if (/^[0-9a-fA-F:]+$/.test(trimmed) && trimmed.includes(':')) return 'ip'
  // Domain
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/.test(trimmed) && !trimmed.includes(' ')) return 'domain'
  // Hash (MD5, SHA1, SHA256)
  if (/^[a-fA-F0-9]{32}$/.test(trimmed)) return 'md5'
  if (/^[a-fA-F0-9]{40}$/.test(trimmed)) return 'sha1'
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) return 'sha256'
  return 'unknown'
}

function getIocIcon(type) {
  switch (type) {
    case 'ip': return Globe
    case 'domain': return Globe
    case 'md5':
    case 'sha1':
    case 'sha256':
      return Hash
    default: return Search
  }
}

function getIocLabel(type) {
  switch (type) {
    case 'ip': return 'IP Address'
    case 'domain': return 'Domain'
    case 'md5': return 'MD5 Hash'
    case 'sha1': return 'SHA-1 Hash'
    case 'sha256': return 'SHA-256 Hash'
    default: return 'Unknown'
  }
}

export default function IocLookup() {
  const [inputValue, setInputValue] = useState('')
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  const handleLookup = async (e) => {
    e.preventDefault()
    const value = inputValue.trim()
    if (!value) return

    const type = detectIocType(value)
    if (type === 'unknown') {
      setError('Could not detect IOC type. Enter an IP address, domain, or hash (MD5/SHA1/SHA256).')
      return
    }

    setError('')
    setIsLoading(true)
    setResults(null)

    try {
      let result = { type, value, timestamp: new Date() }

      if (type === 'ip') {
        // Use AbuseIPDB free API (no key needed for basic check via their public interface)
        // Note: AbuseIPDB requires an API key for the full API, so we'll use a fallback approach
        // We'll check via their public web interface and also provide VT link
        result = {
          ...result,
          abuseIpDb: {
            available: false,
            note: 'AbuseIPDB API requires a free API key. Sign up at abuseipdb.com for API access.',
          },
          virustotalUrl: `${VIRUSTOTAL_UI_BASE}/ip-address/${value}`,
          ipinfoUrl: `https://ipinfo.io/${value}`,
          shodanUrl: `https://www.shodan.io/host/${value}`,
          censysUrl: `https://search.censys.io/hosts/${value}`,
        }
      } else if (type === 'domain') {
        result = {
          ...result,
          virustotalUrl: `${VIRUSTOTAL_UI_BASE}/domain/${value}`,
          urlscanUrl: `https://urlscan.io/domain/${value}`,
          shodanUrl: `https://www.shodan.io/search?query=${encodeURIComponent(value)}`,
          censysUrl: `https://search.censys.io/certificates?q=${encodeURIComponent(value)}`,
        }
      } else {
        // Hash lookup
        result = {
          ...result,
          virustotalUrl: `${VIRUSTOTAL_UI_BASE}/file/${value}`,
          hybridAnalysisUrl: `https://www.hybrid-analysis.com/search?query=${value}`,
          malwareBazaarUrl: `https://bazaar.abuse.ch/browse.php?search=${value}`,
          otxUrl: `https://otx.alienvault.com/indicator/file/${value}`,
        }
      }

      setResults(result)
      setHistory((prev) => [result, ...prev.slice(0, 9)])
    } catch (err) {
      setError(`Lookup failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const iocType = inputValue.trim() ? detectIocType(inputValue.trim()) : null
  const IocIcon = iocType ? getIocIcon(iocType) : Search

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">IOC Lookup</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Investigate IPs, domains, and file hashes against threat intelligence platforms
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleLookup} className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <IocIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setError('') }}
              placeholder="Enter IP address, domain, or file hash (MD5/SHA1/SHA256)"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-9 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none font-mono"
            />
            {iocType && iocType !== 'unknown' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                {getIocLabel(iocType)}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
          >
            {isLoading ? 'Looking up...' : 'Lookup'}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </form>

      {/* Results */}
      {results && (
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-sky-500/10 p-2">
              {(() => { const Icon = getIocIcon(results.type); return <Icon className="h-5 w-5 text-sky-400" /> })()}
            </div>
            <div>
              <p className="font-mono text-sm font-bold text-white">{results.value}</p>
              <p className="text-xs text-slate-400">{getIocLabel(results.type)} • {results.timestamp.toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">External Analysis Links</p>
            {Object.entries(results)
              .filter(([key, val]) => key.endsWith('Url') && val)
              .map(([key, url]) => {
                const label = key
                  .replace('Url', '')
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (s) => s.toUpperCase())
                  .trim()
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3 text-sm text-slate-200 transition hover:border-sky-500/50 hover:text-white"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-slate-500" />
                      Analyze on {label}
                    </span>
                    <Search className="h-4 w-4 text-slate-500" />
                  </a>
                )
              })}

            {results.abuseIpDb && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-300">
                <Info className="inline h-3.5 w-3.5 mr-1" />
                {results.abuseIpDb.note}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 text-sky-400" />
          <div>
            <p className="text-sm font-medium text-slate-200">How IOC Lookup Works</p>
            <p className="mt-1 text-xs text-slate-400">
              This tool automatically detects the type of indicator you enter (IP, domain, or hash) and provides
              direct links to analyze it on major threat intelligence platforms including VirusTotal, Shodan, Censys,
              URLScan.io, Hybrid Analysis, MalwareBazaar, and OTX AlienVault. Click any link to open the analysis
              in a new tab. No API keys required — all lookups use free public interfaces.
            </p>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Recent Lookups</h2>
          <div className="space-y-2">
            {history.map((item, idx) => (
              <button
                key={idx}
                onClick={() => { setInputValue(item.value); setResults(item) }}
                className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-left transition hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  {(() => { const Icon = getIocIcon(item.type); return <Icon className="h-4 w-4 text-slate-500" /> })()}
                  <span className="font-mono text-sm text-slate-300">{item.value}</span>
                  <span className="text-xs text-slate-500">{getIocLabel(item.type)}</span>
                </div>
                <span className="text-xs text-slate-600">{item.timestamp.toLocaleTimeString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!results && !isLoading && history.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-3 text-sm text-slate-400">Enter an IOC to investigate</p>
          <p className="mt-1 text-xs text-slate-600">Supports IPs, domains, MD5, SHA-1, and SHA-256 hashes</p>
        </div>
      )}
    </div>
  )
}
