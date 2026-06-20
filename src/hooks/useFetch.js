import { useState, useEffect, useCallback, useRef } from 'react'

const CACHE = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes default

export function useFetch(url, options = {}) {
  const {
    ttl = CACHE_TTL,
    enabled = true,
    transform = (data) => data,
    initialData = null,
  } = options

  const [data, setData] = useState(() => {
    if (!url) return initialData
    const cached = CACHE.get(url)
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data
    }
    return initialData
  })
  const [isLoading, setIsLoading] = useState(() => {
    if (!url) return false
    const cached = CACHE.get(url)
    return !cached || Date.now() - cached.timestamp >= ttl
  })
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(() => {
    if (!url) return null
    const cached = CACHE.get(url)
    return cached ? new Date(cached.timestamp) : null
  })
  const abortRef = useRef(null)

  const execute = useCallback(async (overrideUrl) => {
    const fetchUrl = overrideUrl || url
    if (!fetchUrl) return

    // Check cache first
    const cached = CACHE.get(fetchUrl)
    if (cached && Date.now() - cached.timestamp < ttl) {
      setData(cached.data)
      setLastUpdated(new Date(cached.timestamp))
      setIsLoading(false)
      setError(null)
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(fetchUrl, { signal: controller.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const raw = await response.json()
      const transformed = transform(raw)
      CACHE.set(fetchUrl, { data: transformed, timestamp: Date.now() })
      setData(transformed)
      setLastUpdated(new Date())
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
        // Fall back to stale cache if available
        if (cached) {
          setData(cached.data)
          setLastUpdated(new Date(cached.timestamp))
        }
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [url, ttl, transform])

  const refresh = useCallback(() => {
    if (url) CACHE.delete(url)
    return execute()
  }, [url, execute])

  useEffect(() => {
    if (!enabled || !url) return
    execute()
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [url, enabled, execute])

  // Auto-refresh interval
  useEffect(() => {
    if (!enabled || !url || ttl <= 0) return
    const interval = setInterval(() => {
      execute()
    }, ttl)
    return () => clearInterval(interval)
  }, [url, enabled, ttl, execute])

  return { data, isLoading, error, lastUpdated, refresh }
}

export function clearCache() {
  CACHE.clear()
}
