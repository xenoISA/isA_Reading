'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import type { GrowthMetrics, Badge, BadgeKey } from '@/types'
import { BADGE_DEFS } from '@/types'

export default function Dashboard({ onClose }: { onClose: () => void }) {
  const { child } = useAuth()
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="size-10 border-4 border-border border-t-accent rounded-full animate-spin mx-auto" />
        <p className="text-muted mt-4">Loading your progress...</p>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">📊</p>
        <p className="text-muted">No data yet. Start reading to see your growth!</p>
        <button onClick={onClose} className="mt-4 px-6 py-3 bg-accent text-white rounded-2xl font-bold">
          Start Reading
        </button>
      </div>
    )
  }

  const earnedBadgeKeys = new Set(badges.map(b => b.badge_key))

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{child?.avatar || '🎓'}</span>
          <div>
            <h2 className="text-xl font-bold text-foreground">{child?.display_name || child?.username}</h2>
            <p className="text-sm text-muted">Level {metrics.reading_level} Reader</p>
          </div>
        </div>
        <button onClick={onClose} className="text-sm text-muted hover:text-foreground font-medium">
          Back
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="📖" value={metrics.total_readings} label="Readings" />
        <StatCard icon="🎯" value={`${metrics.avg_accuracy}%`} label="Avg Score" />
        <StatCard icon="🔥" value={metrics.current_streak} label="Day Streak" />
        <StatCard icon="⭐" value={metrics.total_points} label="Points" />
      </div>

      {/* Vocabulary */}
      <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200">
        <div className="flex items-center gap-2 mb-1">
          <span>📚</span>
          <span className="font-bold text-violet-700">{metrics.vocabulary_learned} words learned</span>
        </div>
        <p className="text-xs text-violet-600">Vocabulary you&apos;ve mastered through reading</p>
      </div>

      {/* Accuracy trend (simple bar chart) */}
      {metrics.accuracy_trend.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-border">
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

      {/* Badges */}
      <div>
        <h3 className="font-bold text-foreground mb-3 text-sm">Achievements</h3>
        <div className="grid grid-cols-4 gap-2">
          {(Object.entries(BADGE_DEFS) as [BadgeKey, typeof BADGE_DEFS[BadgeKey]][]).map(([key, def]) => {
            const earned = earnedBadgeKeys.has(key)
            return (
              <div
                key={key}
                className={`p-3 rounded-2xl text-center transition-all ${
                  earned
                    ? 'bg-amber-50 border-2 border-amber-200'
                    : 'bg-gray-50 border border-gray-200 opacity-40'
                }`}
              >
                <span className="text-2xl">{def.icon}</span>
                <p className="text-[10px] font-semibold text-foreground mt-1 leading-tight">{def.name}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent readings */}
      {metrics.recent_readings.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground mb-3 text-sm">Recent Readings</h3>
          <div className="space-y-2">
            {metrics.recent_readings.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted">{r.date}</p>
                </div>
                <span className={`text-sm font-bold ${
                  r.score >= 80 ? 'text-green-600' : r.score >= 60 ? 'text-amber-600' : 'text-red-500'
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

function StatCard({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="p-3 rounded-2xl bg-white border border-border text-center">
      <span className="text-xl">{icon}</span>
      <p className="text-lg font-bold text-foreground tabular-nums mt-1">{value}</p>
      <p className="text-[10px] text-muted font-medium">{label}</p>
    </div>
  )
}
