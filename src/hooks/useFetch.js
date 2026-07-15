import { useState, useEffect, useCallback, useRef } from 'react'

// Module-level cache so repeated navigations don't refetch identical data.
const CACHE = new Map()
const CACHE_TTL = 5 * 60 * 1000

export function useFetch(url, options = {}) {
  const {
    ttl = CACHE_TTL,
    enabled = true,
    transform = (data) => data,
    initialData = null,
  } = options

  // Keep transform in a ref so it never churns the effect/callback identity.
  const transformRef = useRef(transform)
  transformRef.current = transform

  const [data, setData] = useState(() => cachedValue(url, ttl) ?? initialData)
  const [isLoading, setIsLoading] = useState(() => !url || !cachedValue(url, ttl))
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(() => cachedAt(url))

  const abortRef = useRef(null)
  const urlRef = useRef(url)
  urlRef.current = url

  const execute = useCallback(
    async (overrideUrl) => {
      const fetchUrl = overrideUrl || urlRef.current
      if (!fetchUrl) return

      const cached = cachedValue(fetchUrl, ttl)
      if (cached !== undefined) {
        setData(cached)
        setLastUpdated(cachedAt(fetchUrl))
        setIsLoading(false)
        setError(null)
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(fetchUrl, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const raw = await res.json()
        const transformed = transformRef.current(raw)
        CACHE.set(fetchUrl, { data: transformed, timestamp: Date.now() })
        // Only commit if this request wasn't aborted (avoids stale overwrites).
        if (!controller.signal.aborted) {
          setData(transformed)
          setLastUpdated(new Date())
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message)
          const stale = CACHE.get(fetchUrl)
          if (stale) {
            setData(stale.data)
            setLastUpdated(cachedAt(fetchUrl))
          }
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    },
    // Deliberately omit `transform`/`ttl` from deps — they're read via refs,
    // so this callback stays stable and never triggers a refetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ttl],
  )

  useEffect(() => {
    if (!enabled || !url) return
    execute()
    return () => abortRef.current?.abort()
  }, [url, enabled, execute])

  const refresh = useCallback(() => {
    if (urlRef.current) CACHE.delete(urlRef.current)
    return execute(urlRef.current)
  }, [execute])

  return { data, isLoading, error, lastUpdated, refresh }
}

function cachedValue(url, ttl) {
  if (!url) return undefined
  const hit = CACHE.get(url)
  if (hit && Date.now() - hit.timestamp < ttl) return hit.data
  return undefined
}

function cachedAt(url) {
  if (!url) return null
  const hit = CACHE.get(url)
  return hit ? new Date(hit.timestamp) : null
}

export function clearCache() {
  CACHE.clear()
}
