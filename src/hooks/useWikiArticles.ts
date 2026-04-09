'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapBounds, WikiGeoResult } from '@/types'
import { fetchArticlesInBounds } from '@/lib/wikipedia'

const DEBOUNCE_MS = 300
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours — skip re-fetch if data is fresh
const CACHE_MAX_ENTRIES = 50
const MAX_ARTICLES_IN_MEMORY = 1000
const GRID_SIZE = 0.05 // degrees — snap viewport to this grid so nearby views share cache entries

interface CacheEntry {
  articles: WikiGeoResult[]
  cachedAt: number
}

/**
 * Snap a coordinate to the nearest grid line.
 * This means viewports that differ by a small pan hit the same cache key
 * instead of always being a miss.
 */
function snap(n: number): string {
  return (Math.round(n / GRID_SIZE) * GRID_SIZE).toFixed(2)
}

const CACHE_VERSION = 'v6'

function boundsKey(b: MapBounds): string {
  return `wiki_cache_${CACHE_VERSION}_${snap(b.south)}|${snap(b.west)}|${snap(b.north)}|${snap(b.east)}`
}

function readCache(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry
  } catch {
    return null
  }
}

function writeCache(key: string, articles: WikiGeoResult[]) {
  try {
    const entry: CacheEntry = { articles, cachedAt: Date.now() }
    localStorage.setItem(key, JSON.stringify(entry))

    // Evict oldest entries if we're over the limit
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(`wiki_cache_${CACHE_VERSION}_`))
    if (keys.length > CACHE_MAX_ENTRIES) {
      const withTime = keys
        .map((k) => {
          const e = readCache(k)
          return { key: k, cachedAt: e?.cachedAt ?? 0 }
        })
        .sort((a, b) => a.cachedAt - b.cachedAt)
      localStorage.removeItem(withTime[0].key)
    }
  } catch {
    // Storage full or unavailable — not critical
  }
}

async function fetchSpread(bounds: MapBounds, zoom: number): Promise<WikiGeoResult[]> {
  if (zoom >= 14) {
    return fetchArticlesInBounds(bounds.north, bounds.south, bounds.east, bounds.west)
  }

  // Zoomed out: split into quadrants and fetch each independently so we get
  // geographic spread instead of 150 articles all clustered around the center.
  const midLat = (bounds.north + bounds.south) / 2
  const midLon = (bounds.east + bounds.west) / 2
  const quadrants: MapBounds[] = [
    { north: bounds.north, south: midLat, east: midLon, west: bounds.west },
    { north: bounds.north, south: midLat, east: bounds.east, west: midLon },
    { north: midLat, south: bounds.south, east: midLon, west: bounds.west },
    { north: midLat, south: bounds.south, east: bounds.east, west: midLon },
  ]
  const results = await Promise.all(
    quadrants.map((q) => fetchArticlesInBounds(q.north, q.south, q.east, q.west))
  )
  const seen = new Set<number>()
  return results.flat().filter((a) => {
    if (seen.has(a.pageid)) return false
    seen.add(a.pageid)
    return true
  })
}

export function useWikiArticles(bounds: MapBounds | null, zoom: number) {
  const [articles, setArticles] = useState<WikiGeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mergeArticles = useCallback((newArticles: WikiGeoResult[]) => {
    setArticles((prev) => {
      const combined = [...newArticles, ...prev]
      const seen = new Set<number>()
      const unique = combined.filter((a) => {
        if (seen.has(a.pageid)) return false
        seen.add(a.pageid)
        return true
      })
      // Keep only the most recent set of articles within memory limit
      return unique.slice(0, MAX_ARTICLES_IN_MEMORY)
    })
  }, [])

  useEffect(() => {
    if (!bounds) return

    const key = boundsKey(bounds)
    const cached = readCache(key)

    // Always show cached data immediately so the map isn't blank
    if (cached) {
      mergeArticles(cached.articles)

      // If the cache is still fresh, skip the network fetch entirely
      if (Date.now() - cached.cachedAt < CACHE_TTL_MS) return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const results = await fetchSpread(bounds, zoom)
        mergeArticles(results)
        writeCache(key, results)
      } catch (e) {
        console.error('Wiki fetch error:', e)
        setError(e instanceof Error ? e.message : 'Failed to fetch articles')
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [bounds?.north, bounds?.south, bounds?.east, bounds?.west, zoom, mergeArticles])

  return { articles, loading, error }
}
