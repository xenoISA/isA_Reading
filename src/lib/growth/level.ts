import { getSupabaseClient } from '@/lib/supabase'

// Reading level auto-adjustment rules:
// UP: 3 consecutive readings with 80%+ → level + 1
// DOWN: 2 consecutive readings with <60% → level - 1
export async function adjustReadingLevel(childId: string): Promise<number> {
  const supabase = getSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('reading_level')
    .eq('id', childId)
    .single()

  if (!profile) return 1

  // Get last 3 sessions ordered by most recent
  const { data: recentSessions } = await supabase
    .from('sessions')
    .select('assessment')
    .eq('child_id', childId)
    .eq('status', 'reviewed')
    .order('created_at', { ascending: false })
    .limit(3)

  if (!recentSessions || recentSessions.length === 0) return profile.reading_level

  const scores = recentSessions
    .map(s => (s.assessment as Record<string, unknown>)?.accuracy_score as number)
    .filter(s => typeof s === 'number')

  let newLevel = profile.reading_level

  // Check for level UP: 3 consecutive 80%+
  if (scores.length >= 3 && scores.every(s => s >= 80)) {
    newLevel = Math.min(5, profile.reading_level + 1)
  }

  // Check for level DOWN: 2 consecutive <60%
  if (scores.length >= 2 && scores.slice(0, 2).every(s => s < 60)) {
    newLevel = Math.max(1, profile.reading_level - 1)
  }

  if (newLevel !== profile.reading_level) {
    await supabase
      .from('profiles')
      .update({ reading_level: newLevel, updated_at: new Date().toISOString() })
      .eq('id', childId)
  }

  return newLevel
}
