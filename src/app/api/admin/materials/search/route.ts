import { NextRequest, NextResponse } from 'next/server'
import { searchContent, extractCleanText } from '@/lib/content/tavily-search'
import type { Theme } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { theme, difficulty, query, limit } = await req.json()

    if (!theme) {
      return NextResponse.json({ error: 'theme is required' }, { status: 400 })
    }

    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json({ error: 'TAVILY_API_KEY not configured' }, { status: 503 })
    }

    const results = await searchContent({
      theme: theme as Theme,
      difficulty,
      query,
      limit: limit || 5,
    })

    return NextResponse.json({
      results: results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: extractCleanText(r, 200),
        score: r.score,
      })),
      query_used: query || `${theme} reading`,
      result_count: results.length,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
