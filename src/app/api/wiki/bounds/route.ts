import { NextRequest, NextResponse } from 'next/server'
import { fetchServerBoundsArticles } from '@/lib/serverWikipedia'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const north = parseFloat(searchParams.get('north') ?? '')
  const south = parseFloat(searchParams.get('south') ?? '')
  const east = parseFloat(searchParams.get('east') ?? '')
  const west = parseFloat(searchParams.get('west') ?? '')

  if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
    return NextResponse.json(
      { error: 'Missing or invalid bounds parameters (north, south, east, west)' },
      { status: 400 }
    )
  }

  try {
    const articles = await fetchServerBoundsArticles(north, south, east, west)
    return NextResponse.json(articles, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('API /api/wiki/bounds error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
