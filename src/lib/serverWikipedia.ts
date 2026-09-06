import { WikiGeoResult, WikiSummary } from '@/types'

export const WIKIMEDIA_USER_AGENT =
  'WikiMap/1.0 (https://github.com/Useless-Concoctions/WikiMap; educational map app; contact: ryan@ryanisnota.pro)'

export const SERVER_WIKI_HEADERS: HeadersInit = {
  'User-Agent': WIKIMEDIA_USER_AGENT,
  Accept: 'application/json',
}

interface RawMediaWikiPage {
  pageid: number
  title: string
  coordinates?: Array<{ lat: number; lon: number }>
  length?: number
  categories?: Array<{ title: string }>
  extract?: string
  thumbnail?: {
    source: string
    width: number
    height: number
  }
}

interface RawMediaWikiResponse {
  error?: {
    code: string
    info: string
  }
  query?: {
    pages?: Record<string, RawMediaWikiPage>
  }
}

const CATEGORY_PREFIX = /^Category:/

function parseMediaWikiPages(
  pagesRecord?: Record<string, RawMediaWikiPage>,
  centerLat?: number,
  centerLon?: number
): WikiGeoResult[] {
  if (!pagesRecord) return []

  const results: WikiGeoResult[] = []

  for (const page of Object.values(pagesRecord)) {
    const coords = page.coordinates?.[0]
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lon !== 'number') {
      continue
    }

    let dist = 0
    if (typeof centerLat === 'number' && typeof centerLon === 'number') {
      dist = ((coords.lat - centerLat) ** 2 + (coords.lon - centerLon) ** 2) * 1e10
    }

    const categories = Array.isArray(page.categories)
      ? page.categories.map((c) => c.title.replace(CATEGORY_PREFIX, ''))
      : []

    results.push({
      pageid: page.pageid,
      title: page.title,
      lat: coords.lat,
      lon: coords.lon,
      dist,
      length: typeof page.length === 'number' ? page.length : 1000,
      categories,
      extract: page.extract,
      thumbnail: page.thumbnail,
    })
  }

  return results
}

export async function fetchServerBoundsArticles(
  north: number,
  south: number,
  east: number,
  west: number
): Promise<WikiGeoResult[]> {
  const centerLat = (north + south) / 2
  const centerLon = (east + west) / 2

  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('generator', 'geosearch')
  url.searchParams.set('ggsbbox', `${north}|${west}|${south}|${east}`)
  url.searchParams.set('ggslimit', '150')
  url.searchParams.set('prop', 'coordinates|categories|info|pageimages|extracts')
  url.searchParams.set('exintro', '1')
  url.searchParams.set('explaintext', '1')
  url.searchParams.set('exchars', '400')
  url.searchParams.set('piprop', 'thumbnail')
  url.searchParams.set('pithumbsize', '400')
  url.searchParams.set('cllimit', '50')
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString(), {
    headers: SERVER_WIKI_HEADERS,
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`Wikipedia bounds query failed with status ${res.status}`)
  }

  const data: RawMediaWikiResponse = await res.json()

  if (data.error?.code === 'toobig') {
    return fetchServerRadiusArticles(centerLat, centerLon, 50000)
  }

  return parseMediaWikiPages(data.query?.pages, centerLat, centerLon)
}

export async function fetchServerRadiusArticles(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<WikiGeoResult[]> {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('generator', 'geosearch')
  url.searchParams.set('ggscoord', `${lat}|${lng}`)
  url.searchParams.set('ggsradius', String(radiusMeters))
  url.searchParams.set('ggslimit', '150')
  url.searchParams.set('prop', 'coordinates|categories|info|pageimages|extracts')
  url.searchParams.set('exintro', '1')
  url.searchParams.set('explaintext', '1')
  url.searchParams.set('exchars', '400')
  url.searchParams.set('piprop', 'thumbnail')
  url.searchParams.set('pithumbsize', '400')
  url.searchParams.set('cllimit', '50')
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString(), {
    headers: SERVER_WIKI_HEADERS,
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`Wikipedia radius query failed with status ${res.status}`)
  }

  const data: RawMediaWikiResponse = await res.json()
  return parseMediaWikiPages(data.query?.pages, lat, lng)
}

export async function fetchServerSearchArticles(query: string): Promise<WikiGeoResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrsearch', trimmed)
  url.searchParams.set('gsrlimit', '20')
  url.searchParams.set('prop', 'coordinates|categories|info|pageimages|extracts')
  url.searchParams.set('exintro', '1')
  url.searchParams.set('explaintext', '1')
  url.searchParams.set('exchars', '400')
  url.searchParams.set('piprop', 'thumbnail')
  url.searchParams.set('pithumbsize', '400')
  url.searchParams.set('cllimit', '50')
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString(), {
    headers: SERVER_WIKI_HEADERS,
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`Wikipedia search query failed with status ${res.status}`)
  }

  const data: RawMediaWikiResponse = await res.json()
  return parseMediaWikiPages(data.query?.pages)
}

export async function fetchServerArticleSummary(title: string): Promise<WikiSummary> {
  const encoded = encodeURIComponent(title)
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`, {
    headers: SERVER_WIKI_HEADERS,
    next: { revalidate: 86400 },
  })

  if (!res.ok) {
    throw new Error(`Wikipedia summary failed with status ${res.status}`)
  }

  return res.json()
}
