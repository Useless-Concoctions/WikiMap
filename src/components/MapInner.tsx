'use client'

import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { Coords, MapBounds, WikiGeoResult } from '@/types'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useWikiArticles } from '@/hooks/useWikiArticles'
import { useArticleCategories } from '@/hooks/useArticleCategories'
import { searchArticles } from '@/lib/wikipedia'
import { EMOJI_FILTERS, articleMatchesFilter } from '@/lib/emojiFilters'
import ArticlePanel from './ArticlePanel'
import CategoryFilter from './CategoryFilter'


const createArticleIcon = (isSelected: boolean, emoji: string = '📍') =>
  new L.DivIcon({
    html: `
      <div class="article-marker-container cursor-pointer transition-all duration-300 ${isSelected ? 'scale-125' : 'hover:scale-110'}" style="pointer-events: auto;">
        <div class="relative flex items-center justify-center">
          ${isSelected ? '<div class="absolute inset-0 bg-blue-500/40 blur-md rounded-full scale-150 animate-pulse"></div>' : ''}
          <div class="relative z-10 drop-shadow-2xl flex items-center justify-center">
            <svg width="34" height="40" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg" class="overflow-visible">
              <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 20 14 20s14-9.5 14-20c0-7.73-6.27-14-14-14z" fill="${isSelected ? '#3b82f6' : '#18181b'}" stroke="${isSelected ? '#ffffff' : '#3f3f46'}" stroke-width="1.5"/>
            </svg>
            <span class="absolute top-[7px] text-[13px] leading-none select-none">${emoji}</span>
          </div>
        </div>
      </div>
    `,
    className: 'article-marker-icon',
    iconSize: [34, 40],
    iconAnchor: [17, 40],
  })

const ArticleMarker = memo(({ 
  article, 
  isSelected, 
  onClick,
  emoji 
}: { 
  article: WikiGeoResult, 
  isSelected: boolean, 
  onClick: (a: WikiGeoResult) => void,
  emoji?: string
}) => {
  const icon = useMemo(() => createArticleIcon(isSelected, emoji), [isSelected, emoji])
  return (
    <Marker
      position={[article.lat, article.lon]}
      icon={icon}
      zIndexOffset={isSelected ? 1000 : 500}
      eventHandlers={{
        click: () => onClick(article),
      }}
    >
      <Tooltip direction="top" offset={[0, -30]} opacity={1}>
        <span className="text-xs font-semibold">{article.title}</span>
      </Tooltip>
    </Marker>
  )
})

ArticleMarker.displayName = 'ArticleMarker'

// Your location – pulsing blue dot
const youIcon = new L.DivIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-6 h-6 bg-blue-500/30 rounded-full animate-ping"></div>
      <div class="w-3 h-3 rounded-full bg-blue-500 border-2 border-zinc-900 shadow-[0_0_10px_rgba(59,130,246,0.5)] z-10"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  className: '',
})

function RecenterMap({ coords }: { coords: Coords }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([coords.lat, coords.lng], map.getZoom(), { animate: true, duration: 1.5 })
  }, [coords, map])
  return null
}

function CenterOnSelected({ article }: { article: WikiGeoResult | null }) {
  const map = useMap()
  useEffect(() => {
    if (article) {
      map.flyTo([article.lat, article.lon], Math.max(map.getZoom(), 16), { animate: true, duration: 1 })
    }
  }, [article, map])
  return null
}

// Zoom in = more detail = show more pins. Zoom out = less detail = show fewer, prioritized by distance.
function getMaxPinsForZoom(zoom: number): number {
  if (zoom >= 18) return 100
  if (zoom >= 17) return 80
  if (zoom >= 16) return 60
  if (zoom >= 15) return 50
  if (zoom >= 14) return 40
  if (zoom >= 13) return 30
  if (zoom >= 12) return 25
  if (zoom >= 11) return 20
  if (zoom >= 10) return 15
  return 10
}

// Report visible map bounds and zoom when user pans/zooms so we load articles for what's on screen
function MapViewportSync({
  onViewportChange,
}: {
  onViewportChange: (bounds: MapBounds, zoom: number) => void
}) {
  const map = useMap()
  useEffect(() => {
    const sync = () => {
      const b = map.getBounds()
      onViewportChange(
        {
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        },
        map.getZoom()
      )
    }
    sync()
    map.on('moveend', sync)
    return () => {
      map.off('moveend', sync)
    }
  }, [map, onViewportChange])
  return null
}

function MapController({ coords }: { coords: Coords | null }) {
  const map = useMap()
  return (
    <div className="absolute bottom-10 right-4 z-[1000] flex flex-col gap-2">
      <button
        type="button"
        onClick={() => coords && map.flyTo([coords.lat, coords.lng], 16, { animate: true, duration: 1.5 })}
        className="w-10 h-10 flex items-center justify-center rounded-full glass text-blue-400 hover:text-blue-300 transition-all shadow-xl disabled:opacity-50"
        title="My location"
        disabled={!coords}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <circle cx="12" cy="12" r="8" />
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="2" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
        </svg>
      </button>
      <div className="flex flex-col rounded-2xl overflow-hidden glass shadow-2xl">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors border-b border-white/5"
          title="Zoom in"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
          title="Zoom out"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

const DEFAULT_CENTER: Coords = { lat: 43.6532, lng: -79.3832 }

/** Default bounds around DEFAULT_CENTER for initial load before map reports bounds. */
const DEFAULT_BOUNDS: MapBounds = {
  north: DEFAULT_CENTER.lat + 0.015,
  south: DEFAULT_CENTER.lat - 0.015,
  east: DEFAULT_CENTER.lng + 0.015,
  west: DEFAULT_CENTER.lng - 0.015,
}

export default function MapInner() {
  const { coords, error: geoError, loading: geoLoading } = useGeolocation()
  const [viewportBounds, setViewportBounds] = useState<MapBounds | null>(null)
  const [viewportZoom, setViewportZoom] = useState<number>(15)
  const [useDefaultLocation, setUseDefaultLocation] = useState(false)
  const handleViewportChange = useCallback((bounds: MapBounds, zoom: number) => {
    setViewportBounds(bounds)
    setViewportZoom(zoom)
  }, [])
  const bounds = viewportBounds ?? DEFAULT_BOUNDS
  const { articles, loading: wikiLoading } = useWikiArticles(bounds, viewportZoom)
  const { categoriesByPageId, lengthByPageId, loading: catsLoading, emojiByPageId } = useArticleCategories(articles)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<WikiGeoResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const results = await searchArticles(searchQuery)
      if (results.length > 0) {
        const bestMatch = results[0]
        setSelectedArticle(bestMatch)
        // The map will auto-fly to this article via CenterOnSelected
      }
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const filteredBySearch = searchQuery.trim() === ''
    ? articles
    : articles.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const activeEmojiFilter = selectedCategory == null ? null : EMOJI_FILTERS.find((f) => f.id === selectedCategory) ?? null

  const categoryFiltered =
    activeEmojiFilter == null
      ? filteredBySearch
      : filteredBySearch.filter((a) => {
          const cats = categoriesByPageId.get(a.pageid) ?? []
          return articleMatchesFilter(cats, activeEmojiFilter)
        })
  // Prioritize by distance (closest first), then cap by zoom so zoom out = less detail
  const maxPins = getMaxPinsForZoom(viewportZoom)
  
  const displayArticles = useMemo(() => {
    const centerLat = (bounds.north + bounds.south) / 2
    const centerLon = (bounds.east + bounds.west) / 2
    const importanceWeight = Math.max(0, (15 - viewportZoom) / 10)

    const score = (a: WikiGeoResult) => {
      const dist = a.dist ?? ((a.lat - centerLat) ** 2 + (a.lon - centerLon) ** 2) * 1e10
      const len = lengthByPageId.get(a.pageid) ?? 1000
      return dist / Math.pow(len, importanceWeight)
    }

    let selected: WikiGeoResult[]

    if (viewportZoom < 14) {
      // Grid-based selection: divide the viewport into cells, pick the best
      // article per cell. Finer grid = dense areas naturally get more pins.
      const GRID = 7
      const latStep = (bounds.north - bounds.south) / GRID
      const lonStep = (bounds.east - bounds.west) / GRID
      const grid = new Map<string, WikiGeoResult>()

      for (const a of categoryFiltered) {
        const row = Math.min(GRID - 1, Math.floor((bounds.north - a.lat) / latStep))
        const col = Math.min(GRID - 1, Math.floor((a.lon - bounds.west) / lonStep))
        const cellKey = `${row},${col}`
        const existing = grid.get(cellKey)
        if (!existing || score(a) < score(existing)) grid.set(cellKey, a)
      }

      selected = [...grid.values()]
    } else {
      selected = [...categoryFiltered].sort((a, b) => score(a) - score(b)).slice(0, maxPins)
    }

    // Always include selected article if it exists and is filtered in
    if (selectedArticle && !selected.some(a => a.pageid === selectedArticle.pageid)) {
      const isFiltered = categoryFiltered.some(a => a.pageid === selectedArticle.pageid)
      if (isFiltered) selected.push(selectedArticle)
    }

    return selected
  }, [categoryFiltered, maxPins, selectedArticle, bounds, lengthByPageId, viewportZoom])

  const articleToShow = selectedArticle

  if ((geoLoading || geoError) && !useDefaultLocation && !coords) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-zinc-950 relative z-[2000] px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--accent-glow),transparent_70%)] opacity-20 pointer-events-none" />
        <div className="flex flex-col items-center max-w-sm text-center relative z-10 glass p-10 rounded-[32px] border-white/5 shadow-2xl">
          {geoLoading ? (
            <div className="w-16 h-16 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin mb-10" />
          ) : (
            <div className="text-6xl mb-8 drop-shadow-2xl">📍</div>
          )}
          
          <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">
            {geoLoading ? 'Discovering Nearby' : 'Location Required'}
          </h2>
          
          <p className="text-zinc-400 mt-4 text-[15px] font-medium leading-relaxed mb-12">
            {geoLoading 
              ? 'Finding Wikipedia articles around your current surroundings...' 
              : 'Allow location access to reveal world knowledge on your map. Or, start in a featured city.'}
          </p>
          
          <div className="flex flex-col gap-4 w-full">
            <button 
              onClick={() => setUseDefaultLocation(true)}
              className="group relative w-full bg-blue-600 text-white text-sm font-bold py-4.5 rounded-2xl hover:bg-blue-500 transition-all active:scale-[0.98] shadow-2xl shadow-blue-900/20 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              Explore Toronto
            </button>
            
            {geoError && (
              <button
                onClick={() => window.location.reload()}
                className="text-zinc-500 text-xs font-bold hover:text-zinc-300 transition-colors uppercase tracking-widest mt-2"
              >
                Try GPS again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const initialCenter: [number, number] = coords ? [coords.lat, coords.lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[var(--bg)]">
      <MapContainer
        center={initialCenter}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapViewportSync onViewportChange={handleViewportChange} />
        {coords && <RecenterMap coords={coords} />}
        <CenterOnSelected article={selectedArticle} />
        {coords && (
          <Marker position={[coords.lat, coords.lng]} icon={youIcon} zIndexOffset={1000} />
        )}
        {displayArticles.map((a) => (
          <ArticleMarker
            key={a.pageid}
            article={a}
            isSelected={selectedArticle?.pageid === a.pageid}
            onClick={setSelectedArticle}
            emoji={emojiByPageId.get(a.pageid)}
          />
        ))}

        <MapController coords={coords} />
      </MapContainer>

      <div className="absolute top-6 left-6 right-6 z-[1010] flex items-center gap-4 pointer-events-none transition-all duration-500">
        <form 
          onSubmit={handleSearchSubmit}
          className="flex items-center glass rounded-full overflow-hidden pointer-events-auto shrink-0 h-11 w-[320px] transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500/50"
        >
          <div className="px-5 h-full flex items-center gap-2 border-r border-white/5 bg-blue-600/20 text-blue-400 shrink-0">
            {(isSearching || wikiLoading || catsLoading) ? (
              <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
                <path d="M12.09 4.41l-.11.23-.12-.23c-2.43-4.86-9.15-4.86-11.58 0-.28.56.09 1.25.71 1.25h1.22c.28 0 .54-.15.68-.39.54-1.09 1.56-2.12 3.09-2.12 2.37 0 4.14 2 4.14 4.5 0 .28-.22.5-.5.5h-1c-.28 0-.5.22-.5.5s.22.5.5.5h1c.28 0 .5.22.5.5v11.5c0 .28.22.5.5.5s.5-.22.5-.5V10.5c0-.28.22-.5.5-.5h1c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-1c-.28 0-.5-.22-.5-.5 0-2.5 1.77-4.5 4.14-4.5 1.53 0 2.55 1.03 3.09 2.12.14.24.4.39.68.39h1.22c.62 0 .99-.69.71-1.25-2.43-4.86-9.15-4.86-11.58 0z" />
              </svg>
            )}
          </div>
          <div className="flex items-center px-4 flex-1 h-full">
            <input
              type="text"
              placeholder="Search Wikipedia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full text-zinc-100 font-medium text-sm bg-transparent border-none focus:ring-0 placeholder:text-zinc-500 outline-none"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        <div className="flex-1 flex items-center gap-2 pointer-events-auto overflow-x-auto no-scrollbar py-1">
          <CategoryFilter
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>
      </div>

      <ArticlePanel
        article={articleToShow}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  )
}
