import { NextRequest, NextResponse } from 'next/server'
import { generateFromSearch, generateFromText, storeMaterial } from '@/lib/content/pipeline'
import type { Theme } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const {
      theme,
      difficulty,
      raw_text,
      title,
      search_query,
      auto_save,
    } = await req.json()

    if (!theme || !difficulty) {
      return NextResponse.json(
        { error: 'theme and difficulty are required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured' },
        { status: 503 }
      )
    }

    const startTime = Date.now()
    let result

    if (raw_text) {
      // Generate from provided text
      result = await generateFromText(raw_text, theme as Theme, difficulty, title)
    } else {
      // Search via Tavily then generate
      if (!process.env.TAVILY_API_KEY) {
        return NextResponse.json(
          { error: 'TAVILY_API_KEY not configured (needed for search-based generation)' },
          { status: 503 }
        )
      }
      result = await generateFromSearch(theme as Theme, difficulty, search_query)
    }

    // Auto-save if requested and quality passed
    let saved = false
    if (auto_save && result.quality.overall.passed) {
      await storeMaterial(result.material)
      saved = true
    }

    return NextResponse.json({
      material: result.material,
      quality_report: result.quality,
      source: result.source,
      saved,
      generation_time_ms: Date.now() - startTime,
    })
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
