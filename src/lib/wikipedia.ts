import { WikiGeoResult, WikiSummary } from '@/types'

/** Fetch articles inside the visible map bounds via our server API route */
export async function fetchArticlesInBounds(
  north: number,
  south: number,
  east: number,
  west: number
): Promise<WikiGeoResult[]> {
  const params = new URLSearchParams({
    north: String(north),
    south: String(south),
    east: String(east),
    west: String(west),
  })

  const res = await fetch(`/api/wiki/bounds?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch articles in bounds: ${res.status}`)
  }
  return res.json()
}

/** Search Wikipedia articles with coordinates via our server API route */
export async function searchArticles(query: string): Promise<WikiGeoResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const params = new URLSearchParams({ q: trimmed })
  const res = await fetch(`/api/wiki/search?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Failed to search articles: ${res.status}`)
  }
  return res.json()
}

/** Fetch rich article summary via our server API route */
export async function fetchArticleSummary(title: string): Promise<WikiSummary> {
  const params = new URLSearchParams({ title: title.trim() })
  const res = await fetch(`/api/wiki/summary?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch article summary: ${res.status}`)
  }
  return res.json()
}

interface RawCategoryPage {
  pageid?: number
  length?: number
  categories?: Array<{ title: string }>
}

const CATEGORY_PREFIX = 'Category:'

/** Fallback to fetch categories for legacy page IDs if missing */
export async function fetchCategoriesForPages(
  pageIds: number[]
): Promise<{ categories: Map<number, string[]>; lengths: Map<number, number> }> {
  if (pageIds.length === 0) return { categories: new Map(), lengths: new Map() }
  const limit = 50
  const categories = new Map<number, string[]>()
  const lengths = new Map<number, number>()

  for (let i = 0; i < pageIds.length; i += limit) {
    const batch = pageIds.slice(i, i + limit)
    const url = new URL('https://en.wikipedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('prop', 'categories|info')
    url.searchParams.set('pageids', batch.join('|'))
    url.searchParams.set('cllimit', '500')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Wikipedia categories failed: ${res.status}`)
    const data = (await res.json()) as {
      query?: { pages?: Record<string, RawCategoryPage> }
    }
    const pages = data.query?.pages ?? {}
    for (const pageId of batch) {
      const page = pages[String(pageId)]
      const cats = Array.isArray(page?.categories) ? page.categories : []
      categories.set(
        pageId,
        cats.map((c) =>
          c.title.startsWith(CATEGORY_PREFIX)
            ? c.title.slice(CATEGORY_PREFIX.length)
            : c.title
        )
      )
      if (typeof page?.length === 'number') lengths.set(pageId, page.length)
    }
  }
  return { categories, lengths }
}
