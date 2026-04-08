import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import type { LeaderboardEntry } from '@/types'

export async function GET() {
  try {
    const supabase = getSupabaseClient()

    // Top 10 by total points
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar, total_points')
      .order('total_points', { ascending: false })
      .limit(10)

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ leaderboard: [] })
    }

    // Get badge counts for each
    const childIds = profiles.map(p => p.id)
    const { data: badges } = await supabase
      .from('badges')
      .select('child_id')
      .in('child_id', childIds)

    const badgeCounts = new Map<string, number>()
    for (const b of badges || []) {
      badgeCounts.set(b.child_id, (badgeCounts.get(b.child_id) || 0) + 1)
    }

    const leaderboard: LeaderboardEntry[] = profiles.map((p, i) => ({
      rank: i + 1,
      username: p.username,
      avatar: p.avatar,
      total_points: p.total_points,
      badge_count: badgeCounts.get(p.id) || 0,
    }))

    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
