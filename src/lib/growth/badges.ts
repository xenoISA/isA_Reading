import { getSupabaseClient } from '@/lib/supabase'
import type { BadgeKey } from '@/types'

interface BadgeCheckContext {
  childId: string
  totalReadings: number
  totalPoints: number
  currentStreak: number
  latestAccuracy: number
  avgAccuracy: number
  themesRead: string[]
}

type BadgeRule = {
  key: BadgeKey
  check: (ctx: BadgeCheckContext) => boolean
}

const BADGE_RULES: BadgeRule[] = [
  { key: 'first_reading', check: (ctx) => ctx.totalReadings >= 1 },
  { key: 'ten_readings', check: (ctx) => ctx.totalReadings >= 10 },
  { key: 'perfect_score', check: (ctx) => ctx.latestAccuracy >= 100 },
  { key: 'streak_7', check: (ctx) => ctx.currentStreak >= 7 },
  { key: 'streak_30', check: (ctx) => ctx.currentStreak >= 30 },
  { key: 'theme_explorer', check: (ctx) => ctx.themesRead.length >= 8 },
  { key: 'speedster', check: (ctx) => ctx.totalPoints >= 50 },
  { key: 'accuracy_hero', check: (ctx) => ctx.totalReadings >= 10 && ctx.avgAccuracy >= 90 },
]

export async function checkAndAwardBadges(childId: string): Promise<BadgeKey[]> {
  const supabase = getSupabaseClient()

  // Get existing badges
  const { data: existingBadges } = await supabase
    .from('badges')
    .select('badge_key')
    .eq('child_id', childId)

  const earned = new Set((existingBadges || []).map(b => b.badge_key))

  // Get context for badge checks
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_points, current_streak')
    .eq('id', childId)
    .single()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('assessment, material_id')
    .eq('child_id', childId)
    .eq('status', 'reviewed')

  const completedSessions = sessions || []
  const totalReadings = completedSessions.length
  const scores = completedSessions
    .map(s => (s.assessment as Record<string, unknown>)?.accuracy_score as number)
    .filter(s => typeof s === 'number')
  const avgAccuracy = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const latestAccuracy = scores.length > 0 ? scores[scores.length - 1] : 0

  // Get distinct themes read
  const { data: materials } = await supabase
    .from('materials')
    .select('id, theme')

  const materialThemeMap = new Map((materials || []).map(m => [m.id, m.theme]))
  const themesRead = [...new Set(completedSessions.map(s => materialThemeMap.get(s.material_id)).filter(Boolean))] as string[]

  const ctx: BadgeCheckContext = {
    childId,
    totalReadings,
    totalPoints: profile?.total_points || 0,
    currentStreak: profile?.current_streak || 0,
    latestAccuracy,
    avgAccuracy,
    themesRead,
  }

  // Check each badge rule
  const newBadges: BadgeKey[] = []
  for (const rule of BADGE_RULES) {
    if (!earned.has(rule.key) && rule.check(ctx)) {
      const { error } = await supabase
        .from('badges')
        .insert({ child_id: childId, badge_key: rule.key })

      if (!error) newBadges.push(rule.key)
    }
  }

  return newBadges
}
