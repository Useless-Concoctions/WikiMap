import { NextResponse } from 'next/server'
import { fetchServerRandomArticle } from '@/lib/serverWikipedia'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const article = await fetchServerRandomArticle()
    return NextResponse.json(article, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('API /api/wiki/random error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
