import { useState, useMemo } from 'react'
import { Rss, ExternalLink, AlertTriangle, Shield, Clock, RefreshCw } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'

// CISA Alerts RSS feed
const CISA_ALERTS_RSS = 'https://www.cisa.gov/uscert/ncas/alerts.xml'
const CISA_CURRENT_ACTIVITY_RSS = 'https://www.cisa.gov/uscert/ncas/current-activity.xml'

// We'll use a CORS proxy-free approach — fetch RSS via rss2json or parse directly
// Since we're client-side only, we'll use the CISA JSON feeds and also parse RSS

function parseRSSItems(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const items = doc.querySelectorAll('item')
  return Array.from(items).map((item) => ({
    title: item.querySelector('title')?.textContent || '',
    link: item.querySelector('link')?.textContent || '',
    description: item.querySelector('description')?.textContent || '',
    pubDate: item.querySelector('pubDate')?.textContent || '',
    guid: item.querySelector('guid')?.textContent || '',
  }))
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function stripHtml(html) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export default function ThreatIntel() {
  const [activeTab, setActiveTab] = useState('alerts')
  const [searchTerm, setSearchTerm] = useState('')

  // CISA Alerts
  const { data: alertsData, isLoading: alertsLoading, error: alertsError, refresh: refreshAlerts } = useFetch(
    CISA_ALERTS_RSS,
    {
      transform: (text) => parseRSSItems(text),
      initialData: [],
      ttl: 10 * 60 * 1000,
    }
  )

  // CISA Current Activity
  const { data: activityData, isLoading: activityLoading, error: activityError, refresh: refreshActivity } = useFetch(
    CISA_CURRENT_ACTIVITY_RSS,
    {
      transform: (text) => parseRSSItems(text),
      initialData: [],
      ttl: 10 * 60 * 1000,
    }
  )

  const currentItems = activeTab === 'alerts' ? (alertsData || []) : (activityData || [])
  const currentLoading = activeTab === 'alerts' ? alertsLoading : activityLoading
  const currentError = activeTab === 'alerts' ? alertsError : activityError
  const currentRefresh = activeTab === 'alerts' ? refreshAlerts : refreshActivity

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return currentItems
    const q = searchTerm.toLowerCase()
    return currentItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        stripHtml(item.description).toLowerCase().includes(q)
    )
  }, [currentItems, searchTerm])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Threat Intelligence</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            CISA security alerts and current activity — real-time advisories
          </p>
        </div>
        <button
          onClick={currentRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => { setActiveTab('alerts'); setSearchTerm('') }}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
            activeTab === 'alerts'
              ? 'border-amber-500/70 bg-amber-500/10 text-amber-300'
              : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          CISA Alerts
        </button>
        <button
          onClick={() => { setActiveTab('activity'); setSearchTerm('') }}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
            activeTab === 'activity'
              ? 'border-sky-500/70 bg-sky-500/10 text-sky-300'
              : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500'
          }`}
        >
          <Rss className="h-4 w-4" />
          Current Activity
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Rss className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${activeTab === 'alerts' ? 'alerts' : 'activity'}...`}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-9 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Loading / Error */}
      {currentLoading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-300">
          Loading {activeTab === 'alerts' ? 'CISA alerts' : 'current activity'}...
        </div>
      )}
      {currentError && (
        <div className="rounded-xl border border-red-500/70 bg-red-500/10 p-6 text-sm text-red-200">
          Error loading feed: {currentError}. CISA RSS feeds may be temporarily unavailable.
        </div>
      )}

      {/* Feed items */}
      {!currentLoading && !currentError && (
        <>
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
              {searchTerm ? 'No matching items found.' : 'No items available.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.slice(0, 30).map((item, idx) => (
                <article
                  key={item.guid || idx}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                      <p className="mt-1.5 text-xs text-slate-400 line-clamp-3">
                        {stripHtml(item.description).slice(0, 300)}
                        {stripHtml(item.description).length > 300 ? '...' : ''}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.pubDate)}
                        </span>
                      </div>
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-sky-500/50 hover:text-sky-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* Info banner */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 shrink-0 text-sky-400" />
          <div>
            <p className="text-sm font-medium text-slate-200">About CISA Feeds</p>
            <p className="mt-1 text-xs text-slate-400">
              CISA Alerts provide timely information about current security issues, vulnerabilities, and exploits.
              Current Activity entries highlight recently exploited vulnerabilities and emerging threats.
              Data is fetched directly from CISA's public RSS feeds in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
