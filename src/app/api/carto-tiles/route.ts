import { NextRequest, NextResponse } from 'next/server'

const CARTO_HOSTS = ['a', 'b', 'c', 'd'] as const
const CARTO_STYLES = new Set(['light_all', 'dark_all'])

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const style = searchParams.get('style') ?? 'dark_all'
  const z = searchParams.get('z')
  const x = searchParams.get('x')
  const y = searchParams.get('y')
  const key = process.env.CARTO_BASEMAP_API_KEY || 'cb1_28ir_1_3f30bcf0a7156a6ee258c8be'

  const isTilePart = (val: string | null): val is string => Boolean(val && /^\d+$/.test(val))
  if (!CARTO_STYLES.has(style) || !isTilePart(z) || !isTilePart(x) || !isTilePart(y)) {
    return new NextResponse('Invalid tile request', { status: 400 })
  }

  const host = CARTO_HOSTS[(Number(x) + Number(y)) % CARTO_HOSTS.length]
  const keyParam = key ? `?key=${encodeURIComponent(key)}` : ''
  const upstreamUrl = `https://${host}.basemaps.cartocdn.com/${style}/${z}/${x}/${y}.png${keyParam}`

  try {
    const upstream = await fetch(upstreamUrl, {
      next: { revalidate: 86400 },
    })

    const headers = new Headers()
    const contentType = upstream.headers.get('content-type')
    if (contentType) headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    })
  } catch (error) {
    console.error('Tile fetch failed:', error)
    return new NextResponse('Failed to fetch tile', { status: 502 })
  }
}
