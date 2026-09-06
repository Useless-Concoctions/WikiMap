import { NextRequest, NextResponse } from 'next/server'
import { fetchServerArticleSummary } from '@/lib/serverWikipedia'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') ?? ''

  if (!title.trim()) {
    return NextResponse.json({ error: 'Title parameter is required' }, { status: 400 })
  }

  try {
    const summary = await fetchServerArticleSummary(title)
    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error) {
    console.error('API /api/wiki/summary error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
