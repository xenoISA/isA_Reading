'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import type { GrowthMetrics, Badge, BadgeKey } from '@/types'
import { BADGE_DEFS } from '@/types'

export default function Dashboard({ onStartReading }: { onStartReading: () => void }) {
  const { child } = useAuth()
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [vocabStats, setVocabStats] = useState<{ total: number; due: number; mastered: number } | null>(null)
  const [drillsCompleted, setDrillsCompleted] = useState(0)

  useEffect(() => {
    fetch('/api/growth')
      .then(r => r.json())
      .then(data => {
        setMetrics(data.metrics)
        setBadges(data.badges || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // Load vocab queue stats (client-side only)
    import('@/lib/growth/spaced-rep').then(({ getQueueStats }) => {
      setVocabStats(getQueueStats())
    }).catch(() => {})

    // Load drill completion count
    try {
      const count = parseInt(localStorage.getItem('isa-reading-drills-completed') || '0', 10)
      setDrillsCompleted(count)
    } catch {}
  }, [])

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="size-10 border-4 border-border border-t-accent rounded-full animate-spin mx-auto" />
        <p className="text-muted mt-4">Loading your progress...</p>
      </div>
    )
  }

  const earnedBadgeKeys = new Set(badges.map(b => b.badge_key))
  const earnedCount = badges.length

  return (
    <div className="space-y-6 animate-scale-in pb-20">
      {/* Profile header */}
      <div className="flex items-center gap-4 p-5 bg-surface rounded-2xl border border-border">
        <span className="text-5xl">{child?.avatar || '🎓'}</span>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{child?.display_name || child?.username}</h2>
          <p className="text-sm text-muted">Level {metrics?.reading_level || 1} Reader</p>
        </div>
      </div>

      {/* Stats grid — color coded */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={metrics?.total_readings || 0} label="Readings" color="blue" />
        <StatCard value={`${metrics?.avg_accuracy || 0}%`} label="Avg Score" color="green" />
        <StatCard value={metrics?.current_streak || 0} label="Day Streak" color="orange" />
        <StatCard value={metrics?.total_points || 0} label="Points" color="amber" />
      </div>

      {/* Vocabulary */}
      <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 flex items-center gap-3">
        <span className="text-3xl">📚</span>
        <div>
          <p className="font-bold text-violet-700">{metrics?.vocabulary_learned || 0} words learned</p>
          <p className="text-xs text-violet-600">Vocabulary mastered through reading</p>
        </div>
      </div>

      {/* Vocabulary Review Queue */}
      {vocabStats && vocabStats.total > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧠</span>
              <h3 className="font-bold text-indigo-700 text-sm">Vocabulary Review</h3>
            </div>
            {vocabStats.due > 0 && (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-indigo-200 text-indigo-700">
                {vocabStats.due} due today
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-indigo-600 tabular-nums">{vocabStats.total}</p>
              <p className="text-[10px] text-indigo-500">In Queue</p>
            </div>
            <div>
              <p className="text-lg font-bold text-indigo-600 tabular-nums">{vocabStats.due}</p>
              <p className="text-[10px] text-indigo-500">Due Today</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600 tabular-nums">{vocabStats.mastered}</p>
              <p className="text-[10px] text-green-500">Mastered</p>
            </div>
          </div>
        </div>
      )}

      {/* Drill stats */}
      {drillsCompleted > 0 && (
        <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200 flex items-center gap-3">
          <span className="text-3xl">🏋️</span>
          <div>
            <p className="font-bold text-pink-700">{drillsCompleted} drills completed</p>
            <p className="text-xs text-pink-600">Practice makes perfect!</p>
          </div>
        </div>
      )}

      {/* Start reading CTA (if no readings yet) */}
      {(metrics?.total_readings || 0) === 0 && (
        <div className="text-center p-6 bg-orange-50 rounded-2xl border-2 border-orange-200 border-dashed">
          <p className="text-3xl mb-2">📖</p>
          <p className="font-bold text-foreground mb-1">Ready for your first reading?</p>
          <p className="text-sm text-muted mb-4">Pick a story and start practicing!</p>
          <button
            onClick={onStartReading}
            className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold transition-all active:scale-95"
          >
            Start Reading
          </button>
        </div>
      )}

      {/* Accuracy trend */}
      {metrics?.accuracy_trend && metrics.accuracy_trend.length > 0 && (
        <div className="p-4 rounded-2xl bg-surface border border-border">
          <h3 className="font-bold text-foreground mb-3 text-sm">Accuracy Over Time</h3>
          <div className="flex items-end gap-1 h-24">
            {metrics.accuracy_trend.slice(-14).map((point, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max(4, point.score)}%`,
                    backgroundColor: point.score >= 80 ? '#22c55e' : point.score >= 60 ? '#f59e0b' : '#ef4444',
                  }}
                />
                <span className="text-[8px] text-muted">{point.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground text-sm">Achievements</h3>
          <span className="text-xs text-muted">{earnedCount} / {Object.keys(BADGE_DEFS).length} unlocked</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(Object.entries(BADGE_DEFS) as [BadgeKey, typeof BADGE_DEFS[BadgeKey]][]).map(([key, def]) => {
            const earned = earnedBadgeKeys.has(key)
            return (
              <div
                key={key}
                className={`p-3 rounded-2xl text-center transition-all ${
                  earned
                    ? 'bg-amber-50 border-2 border-amber-300 shadow-sm'
                    : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <span className={`text-2xl ${earned ? '' : 'grayscale opacity-30'}`}>{def.icon}</span>
                <p className={`text-[10px] font-semibold mt-1 leading-tight ${earned ? 'text-foreground' : 'text-muted/50'}`}>{def.name}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent readings */}
      {metrics?.recent_readings && metrics.recent_readings.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground mb-3 text-sm">Recent Readings</h3>
          <div className="space-y-2">
            {metrics.recent_readings.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted">{r.date}</p>
                </div>
                <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                  r.score >= 80 ? 'bg-green-50 text-green-600' :
                  r.score >= 60 ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-500'
                }`}>
                  {r.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ value, label, color }: { value: string | number; label: string; color: 'blue' | 'green' | 'orange' | 'amber' }) {
  const styles = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
  }

  return (
    <div className={`p-3 rounded-2xl border text-center ${styles[color]}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold opacity-70">{label}</p>
    </div>
  )
}
