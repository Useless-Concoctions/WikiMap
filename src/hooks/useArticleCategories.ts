'use client'

import { useState, useEffect, useRef } from 'react'
import { WikiGeoResult } from '@/types'
import { fetchCategoriesForPages } from '@/lib/wikipedia'
import { EMOJI_FILTERS, articleMatchesFilter } from '@/lib/emojiFilters'

const MAX_CATEGORIES_SHOWN = 5

/** Wikipedia maintenance category prefixes — these are universal across all of Wikipedia. */
const META_CATEGORY_PREFIXES = [
  'Articles with ',
  'All articles with ',
  'All articles needing ',
  'All stub ',
  'Articles needing ',
  'Articles using ',
  'Pages using ',
  'Coordinates on ',
  'Short description ',
  'All Wikipedia ',
  'Wikipedia articles ',
  'Use ',
  'Use mdy ',
  'CS1 ',
  'CS1:',
  'Commons category ',
  'Infobox ',
  'Webarchive ',
  'Pages with ',
  'Redirects ',
  'Lists of ',
]

const META_CATEGORY_SUBSTRINGS = [
  'unsourced',
  'additional references',
  'needing references',
  'using infobox',
  'needing cleanup',
  'notability',
  'refimprove',
  'citation needed',
  'dead link',
  'orphan',
  'stub',
  'disambiguation',
  'coordinates',
  'portal',
  'template',
  'redirect',
  'maintenance',
  'wikify',
  'official website',
  'wikidata',
]

function isMetaCategory(name: string): boolean {
  const n = name.toLowerCase()
  if (META_CATEGORY_PREFIXES.some((p) => name.startsWith(p))) return true
  return META_CATEGORY_SUBSTRINGS.some((s) => n.includes(s))
}

/** Words that carry no meaningful identity in a category name. */
const STOP_WORDS = new Set([
  'in', 'of', 'the', 'a', 'an', 'and', 'or', 'with', 'for', 'by', 'at',
  'to', 'from', 'on', 'as', 'its', 'their', 'associated', 'affiliated',
  'related', 'buildings', 'structures', 'establishments', 'institutions',
  'list', 'lists', 'former', 'history', 'historic', 'historical',
])

/** Extract the meaningful words from a category name. */
function getTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
  )
}

/**
 * Jaccard similarity: size of intersection divided by size of union.
 * Returns a value between 0 (nothing in common) and 1 (identical).
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let intersection = 0
  for (const t of a) if (b.has(t)) intersection++
  return intersection / (a.size + b.size - intersection)
}

/** Two categories are considered duplicates if 60%+ of their meaningful words overlap. */
const DUPLICATE_THRESHOLD = 0.6

type CacheEntry = { categories: Map<number, string[]>; lengths: Map<number, number> }

// Persistent cache outside the hook to survive re-renders and unmounts
const globalCategoryCache = new Map<number, string[]>()
const globalLengthCache = new Map<number, number>()

export function useArticleCategories(articles: WikiGeoResult[]) {
  const [categoriesByPageId, setCategoriesByPageId] = useState<Map<number, string[]>>(new Map(globalCategoryCache))
  const [lengthByPageId, setLengthByPageId] = useState<Map<number, number>>(new Map(globalLengthCache))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (articles.length === 0) return

    // Find page IDs we don't have categories for yet
    const missingIds = articles
      .map((a) => a.pageid)
      .filter((id) => !globalCategoryCache.has(id))

    if (missingIds.length === 0) {
      // All articles already in cache, just ensure state is synced
      setCategoriesByPageId(new Map(globalCategoryCache))
      setLengthByPageId(new Map(globalLengthCache))
      return
    }

    let cancelled = false
    setLoading(true)
    
    // Fetch only the missing IDs
    fetchCategoriesForPages(missingIds)
      .then(({ categories, lengths }) => {
        if (!cancelled) {
          // Update global cache
          categories.forEach((cats, id) => globalCategoryCache.set(id, cats))
          lengths.forEach((len, id) => globalLengthCache.set(id, len))
          
          // Update local state with the full cache
          setCategoriesByPageId(new Map(globalCategoryCache))
          setLengthByPageId(new Map(globalLengthCache))
        }
      })
      .catch((err) => {
        console.error('Failed to fetch categories:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [articles])

  const categoryCounts = new Map<string, number>()
  categoriesByPageId.forEach((cats) => {
    cats.forEach((c) => {
      if (!isMetaCategory(c)) categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1)
    })
  })
  const sortedEntries = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])
  const uniqueCategories: string[] = []
  const usedTokenSets: Set<string>[] = []

  for (const [name] of sortedEntries) {
    if (uniqueCategories.length >= MAX_CATEGORIES_SHOWN) break

    const tokens = getTokens(name)
    if (tokens.size === 0) continue

    const isDuplicate = usedTokenSets.some(
      (existing) => jaccardSimilarity(tokens, existing) >= DUPLICATE_THRESHOLD
    )

    if (!isDuplicate) {
      uniqueCategories.push(name)
      usedTokenSets.push(tokens)
    }
  }

  // derive emojis for each article based on its categories
  const emojiByPageId = new Map<number, string>()
  categoriesByPageId.forEach((cats, id) => {
    const match = EMOJI_FILTERS.find((f) => articleMatchesFilter(cats, f))
    if (match) emojiByPageId.set(id, match.emoji)
  })

  return { categoriesByPageId, lengthByPageId, uniqueCategories, emojiByPageId, loading }
}
