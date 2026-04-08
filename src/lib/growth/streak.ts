import { getSupabaseClient } from '@/lib/supabase'

export async function updateStreak(childId: string): Promise<{ current: number; longest: number }> {
  const supabase = getSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_reading_date')
    .eq('id', childId)
    .single()

  if (!profile) return { current: 0, longest: 0 }

  const today = new Date().toISOString().split('T')[0]
  const lastDate = profile.last_reading_date

  let newStreak = profile.current_streak

  if (lastDate === today) {
    // Already read today, no change
    return { current: profile.current_streak, longest: profile.longest_streak }
  }

  if (lastDate) {
    const lastDay = new Date(lastDate)
    const todayDay = new Date(today)
    const diffMs = todayDay.getTime() - lastDay.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      // Consecutive day — increment streak
      newStreak = profile.current_streak + 1
    } else {
      // Gap — reset streak
      newStreak = 1
    }
  } else {
    // First reading ever
    newStreak = 1
  }

  const newLongest = Math.max(newStreak, profile.longest_streak)

  await supabase
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_reading_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', childId)

  return { current: newStreak, longest: newLongest }
}
