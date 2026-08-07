import { useState, useEffect } from 'react'
import { fetchScrapeStatus } from '../api/scheduleApi'

const CACHE_KEY = 'kfu-scrape-status'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedStatus() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL) {
        return {
          lastUpdate: data.last_update ? new Date(data.last_update) : null,
          status: data.status,
        }
      }
    }
  } catch {
    // ignore parse errors
  }
  return null
}

/**
 * Custom hook for fetching the latest scraper execution timestamp.
 * Caches results in `sessionStorage` for 5 minutes (`CACHE_TTL`).
 */
export function useScrapeStatus() {
  const cached = getCachedStatus()

  const [lastUpdate, setLastUpdate] = useState(cached?.lastUpdate ?? null)
  const [status, setStatus] = useState(cached?.status ?? 'idle')
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (getCachedStatus()) return

    let cancelled = false

    async function loadStatus() {
      try {
        const data = await fetchScrapeStatus()
        if (cancelled) return
        setLastUpdate(data.last_update ? new Date(data.last_update) : null)
        setStatus(data.status)
        setError(null)

        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }))
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadStatus()
    return () => { cancelled = true }
  }, [])

  return { lastUpdate, status, loading, error }
}
