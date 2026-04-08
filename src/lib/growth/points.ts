import { getSupabaseClient } from '@/lib/supabase'

interface PointsResult {
  total: number
  breakdown: { points: number; reason: string }[]
}

export function calculatePoints(accuracyScore: number, currentStreak: number): PointsResult {
  const breakdown: { points: number; reason: string }[] = []

  // Base points for completing a reading
  breakdown.push({ points: 10, reason: 'reading_complete' })

  // Accuracy bonuses
  if (accuracyScore >= 95) {
    breakdown.push({ points: 10, reason: 'accuracy_95' })
  } else if (accuracyScore >= 80) {
    breakdown.push({ points: 5, reason: 'accuracy_80' })
  }

  // Streak bonus
  if (currentStreak > 0) {
    breakdown.push({ points: 3, reason: 'streak_bonus' })
  }

  const total = breakdown.reduce((sum, b) => sum + b.points, 0)
  return { total, breakdown }
}

export async function awardPoints(
  childId: string,
  sessionId: string,
  accuracyScore: number,
  currentStreak: number
): Promise<PointsResult> {
  const result = calculatePoints(accuracyScore, currentStreak)
  const supabase = getSupabaseClient()

  // Insert points log entries
  const entries = result.breakdown.map(b => ({
    child_id: childId,
    session_id: sessionId,
    points: b.points,
    reason: b.reason,
  }))

  await supabase.from('points_log').insert(entries)

  // Update total points on profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_points')
    .eq('id', childId)
    .single()

  if (profile) {
    await supabase
      .from('profiles')
      .update({ total_points: (profile.total_points || 0) + result.total })
      .eq('id', childId)
  }

  return result
}
