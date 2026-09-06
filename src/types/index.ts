export interface Coords {
  lat: number
  lng: number
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export type Radius = 500 | 1000 | 2000

export interface WikiGeoResult {
  pageid: number
  title: string
  lat: number
  lon: number
  dist: number
  length?: number
  categories?: string[]
  extract?: string
  thumbnail?: {
    source: string
    width: number
    height: number
  }
}

export interface WikiSummary {
  title: string
  extract: string
  thumbnail?: {
    source: string
    width: number
    height: number
  }
  content_urls: {
    desktop: { page: string }
    mobile: { page: string }
  }
}
