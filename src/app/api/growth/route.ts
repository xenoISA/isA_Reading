import { NextResponse } from 'next/server'
import { getCurrentChild } from '@/lib/auth/session'
import { getSupabaseClient } from '@/lib/supabase'
import type { GrowthMetrics } from '@/types'

export async function GET() {
  try {
    const child = await getCurrentChild()
    if (!child) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = getSupabaseClient()

    // Get all completed sessions for this child
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, material_id, assessment, created_at')
      .eq('child_id', child.id)
      .eq('status', 'reviewed')
      .order('created_at', { ascending: true })

    const completedSessions = sessions || []

    // Compute accuracy trend (group by date)
    const accuracyByDate = new Map<string, number[]>()
    for (const s of completedSessions) {
      const score = (s.assessment as Record<string, unknown>)?.accuracy_score as number
      if (typeof score !== 'number') continue
      const date = new Date(s.created_at).toISOString().split('T')[0]
      if (!accuracyByDate.has(date)) accuracyByDate.set(date, [])
      accuracyByDate.get(date)!.push(score)
    }

    const accuracyTrend = Array.from(accuracyByDate.entries()).map(([date, scores]) => ({
      date,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))

    // Compute avg accuracy
    const allScores = completedSessions
      .map(s => (s.assessment as Record<string, unknown>)?.accuracy_score as number)
      .filter(s => typeof s === 'number')
    const avgAccuracy = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0

    // Vocabulary learned (keywords with good scores)
    const vocabSet = new Set<string>()
    for (const s of completedSessions) {
      const assessment = s.assessment as Record<string, unknown>
      const kwAccuracy = assessment?.keyword_accuracy as { word: string; correct: boolean }[] | undefined
      if (kwAccuracy) {
        for (const kw of kwAccuracy) {
          if (kw.correct) vocabSet.add(kw.word.toLowerCase())
        }
      }
    }

    // Aggregate error patterns
    const errorPatterns = new Map<string, { count: number; words: string[] }>()
    for (const s of completedSessions) {
      const assessment = s.assessment as Record<string, unknown>
      const categories = assessment?.error_categories as { word: string; category: string; tip: string }[] | undefined
      if (categories) {
        for (const cat of categories) {
          if (!errorPatterns.has(cat.category)) {
            errorPatterns.set(cat.category, { count: 0, words: [] })
          }
          const entry = errorPatterns.get(cat.category)!
          entry.count++
          if (!entry.words.includes(cat.word) && entry.words.length < 5) {
            entry.words.push(cat.word)
          }
        }
      }
    }

    const errorPatternsArray = Array.from(errorPatterns.entries())
      .map(([category, data]) => ({ category, count: data.count, example_words: data.words }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Recent readings
    const { data: materials } = await supabase.from('materials').select('id, title')
    const materialMap = new Map((materials || []).map(m => [m.id, m.title]))

    const recentReadings = completedSessions.slice(-10).reverse().map(s => ({
      date: new Date(s.created_at).toISOString().split('T')[0],
      title: materialMap.get(s.material_id) || 'Unknown',
      score: (s.assessment as Record<string, unknown>)?.accuracy_score as number || 0,
      material_id: s.material_id,
    }))

    // Get badges
    const { data: badges } = await supabase
      .from('badges')
      .select('badge_key, awarded_at')
      .eq('child_id', child.id)

    const metrics: GrowthMetrics = {
      total_readings: completedSessions.length,
      avg_accuracy: avgAccuracy,
      reading_level: child.reading_level,
      current_streak: child.current_streak,
      longest_streak: child.longest_streak,
      total_points: child.total_points,
      vocabulary_learned: vocabSet.size,
      accuracy_trend: accuracyTrend,
      recent_readings: recentReadings,
      error_patterns: errorPatternsArray,
    }

    return NextResponse.json({ metrics, badges: badges || [] })
  } catch (error) {
    console.error('Growth API error:', error)
    return NextResponse.json({ error: 'Failed to fetch growth data' }, { status: 500 })
  }
}
