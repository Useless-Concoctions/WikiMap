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

const SURPRISE_ANCHORS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Colosseum, Rome', lat: 41.8902, lng: 12.4922 },
  { name: 'Eiffel Tower, Paris', lat: 48.8584, lng: 2.2945 },
  { name: 'Taj Mahal, India', lat: 27.1751, lng: 78.0421 },
  { name: 'Machu Picchu, Peru', lat: -13.1631, lng: -72.545 },
  { name: 'Great Pyramid of Giza, Egypt', lat: 29.9792, lng: 31.1342 },
  { name: 'Petra, Jordan', lat: 30.3285, lng: 35.4444 },
  { name: 'Acropolis of Athens, Greece', lat: 37.9715, lng: 23.7257 },
  { name: 'Kyoto Historic Monuments, Japan', lat: 35.0394, lng: 135.7292 },
  { name: 'Angkor Wat, Cambodia', lat: 13.4125, lng: 103.867 },
  { name: 'Stonehenge, England', lat: 51.1789, lng: -1.8262 },
  { name: 'Grand Canyon, USA', lat: 36.1069, lng: -112.1129 },
  { name: 'Statue of Liberty, New York', lat: 40.6892, lng: -74.0445 },
  { name: 'Sydney Opera House, Australia', lat: -33.8568, lng: 151.2153 },
  { name: 'Alhambra, Granada, Spain', lat: 37.1773, lng: -3.5986 },
  { name: 'Chichen Itza, Mexico', lat: 20.6843, lng: -88.5678 },
  { name: 'Venice Grand Canal, Italy', lat: 45.4371, lng: 12.3326 },
  { name: 'Serengeti National Park, Tanzania', lat: -2.3333, lng: 34.8333 },
  { name: 'Table Mountain, Cape Town', lat: -33.9628, lng: 18.4098 },
  { name: 'Hagia Sophia, Istanbul', lat: 41.0086, lng: 28.9802 },
  { name: 'Banff National Park, Canada', lat: 51.4968, lng: -115.9281 },
  { name: 'Easter Island (Rapa Nui), Chile', lat: -27.1127, lng: -109.3497 },
  { name: 'Galapagos Islands, Ecuador', lat: -0.9538, lng: -90.9656 },
  { name: 'Dubrovnik Old Town, Croatia', lat: 42.6413, lng: 18.1084 },
  { name: 'Mount Fuji, Japan', lat: 35.3606, lng: 138.7274 },
  { name: 'Christ the Redeemer, Rio de Janeiro', lat: -22.9519, lng: -43.2105 },
  { name: 'Mont Saint-Michel, France', lat: 48.636, lng: -1.5115 },
  { name: 'Neuschwanstein Castle, Germany', lat: 47.5576, lng: 10.7498 },
  { name: 'Victoria Falls, Zambia/Zimbabwe', lat: -17.9243, lng: 25.8572 },
  { name: 'Forbidden City, Beijing', lat: 39.9163, lng: 116.3972 },
]

export async function fetchServerRandomArticle(): Promise<WikiGeoResult> {
  const shuffled = [...SURPRISE_ANCHORS].sort(() => Math.random() - 0.5)

  for (const anchor of shuffled.slice(0, 5)) {
    try {
      const articles = await fetchServerRadiusArticles(anchor.lat, anchor.lng, 8000)
      const notable = articles.filter(
        (a) => (a.length ?? 0) >= 3000 && !!a.extract && a.title.length > 2
      )
      const candidates = notable.length > 0 ? notable : articles
      if (candidates.length > 0) {
        const picked = candidates[Math.floor(Math.random() * candidates.length)]
        return picked
      }
    } catch {
      continue
    }
  }

  // Absolute fallback
  return {
    pageid: 6112,
    title: 'CN Tower',
    lat: 43.64255556,
    lon: -79.38708333,
    dist: 0,
    length: 72000,
    extract:
      'The CN Tower is a 553.3-metre-high communications and observation tower in Toronto, Ontario, Canada.',
  }
}
