import { NextRequest, NextResponse } from 'next/server'
import { createLLMProvider } from '@/lib/providers/llm'
import { getCurrentChild } from '@/lib/auth/session'
import { awardPoints } from '@/lib/growth/points'
import { checkAndAwardBadges } from '@/lib/growth/badges'
import { updateStreak } from '@/lib/growth/streak'
import { adjustReadingLevel } from '@/lib/growth/level'

export async function POST(req: NextRequest) {
  try {
    const {
      session_id,
      material_id,
      target_text,
      student_text,
      difficulty,
      domain,
      paragraph_index,
      total_paragraphs,
      keywords,
    } = await req.json()

    if (!target_text || !student_text) {
      return NextResponse.json(
        { error: 'target_text and student_text are required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured. Add it to .env.local' },
        { status: 503 }
      )
    }

    const provider = createLLMProvider('openrouter')
    const assessment = await provider.assess(target_text, student_text, {
      difficulty,
      domain,
      paragraphIndex: paragraph_index,
      totalParagraphs: total_paragraphs,
      keywords,
    })

    // Growth tracking — only if Supabase configured and user logged in
    let pointsEarned = 0
    let newBadges: string[] = []
    let streakInfo = { current: 0, longest: 0 }
    let newLevel: number | undefined

    const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    if (useSupabase) {
      // Persist assessment
      if (session_id) {
        try {
          const { getSupabaseClient } = await import('@/lib/supabase')
          const supabase = getSupabaseClient()
          await supabase
            .from('sessions')
            .update({ assessment, status: 'reviewed' })
            .eq('id', session_id)
        } catch (dbError) {
          console.warn('Failed to persist assessment:', dbError)
        }
      }

      // Award points, badges, update streak — if logged in
      try {
        const child = await getCurrentChild()
        if (child) {
          streakInfo = await updateStreak(child.id)
          const points = await awardPoints(child.id, session_id || '', assessment.accuracy_score, streakInfo.current)
          pointsEarned = points.total
          newBadges = await checkAndAwardBadges(child.id)
          newLevel = await adjustReadingLevel(child.id)
        }
      } catch (growthError) {
        console.warn('Growth tracking error (non-blocking):', growthError)
      }
    }

    return NextResponse.json({
      ...assessment,
      session_id,
      material_id,
      paragraph_index,
      model_used: provider.name,
      evaluated_at: new Date().toISOString(),
      // Growth data (returned to frontend for immediate display)
      points_earned: pointsEarned,
      new_badges: newBadges,
      streak: streakInfo.current,
      reading_level: newLevel,
    })
  } catch (error) {
    console.error('Assessment error:', error)
    return NextResponse.json(
      { error: 'Assessment failed' },
      { status: 500 }
    )
  }
}
