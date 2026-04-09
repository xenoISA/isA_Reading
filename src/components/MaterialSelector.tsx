'use client'

import { useState, useEffect } from 'react'
import type { Material, Theme } from '@/types'
import { THEMES } from '@/types'

const LEVEL_CONFIG: Record<number, { label: string; color: string; bg: string; icon: string }> = {
  1: { label: 'Starter', color: 'text-green-600', bg: 'bg-green-50 border-green-200 hover:border-green-400', icon: '🌱' },
  2: { label: 'Easy', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200 hover:border-blue-400', icon: '🌿' },
  3: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200 hover:border-amber-400', icon: '🌳' },
  4: { label: 'Hard', color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200 hover:border-pink-400', icon: '🌟' },
  5: { label: 'Expert', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200 hover:border-violet-400', icon: '🏆' },
}

interface Props {
  onSelect: (material: Material) => void
  selected?: Material | null
  preferredThemes?: Theme[]
  savedMaterialId?: string | null
  readingLevel?: number
  avgAccuracy?: number
}

export default function MaterialSelector({ onSelect, selected, preferredThemes, savedMaterialId, readingLevel, avgAccuracy }: Props) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [difficulty, setDifficulty] = useState<number | null>(null)
  const [theme, setTheme] = useState<Theme | null>(null)
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<{ material: Material; reason: string }[]>([])

  useEffect(() => {
    const params = new URLSearchParams()
    if (difficulty) params.set('difficulty', String(difficulty))
    if (theme) params.set('theme', theme)
    const qs = params.toString()

    setLoading(true)
    fetch(`/api/materials${qs ? `?${qs}` : ''}`)
      .then(r => r.json())
      .then((data: Material[]) => {
        // If preferred themes set and no explicit theme filter, sort preferred first
        if (preferredThemes?.length && !theme) {
          data.sort((a, b) => {
            const aPreferred = preferredThemes.includes(a.theme) ? 0 : 1
            const bPreferred = preferredThemes.includes(b.theme) ? 0 : 1
            return aPreferred - bPreferred || a.difficulty - b.difficulty
          })
        }
        setMaterials(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [difficulty, theme, preferredThemes])

  useEffect(() => {
    if (materials.length === 0) return
    import('@/lib/recommendations').then(({ getRecommendations, getCompletedMaterialIds }) => {
      const completedIds = getCompletedMaterialIds()
      const recs = getRecommendations(materials, {
        readingLevel: readingLevel || 1,
        avgAccuracy: avgAccuracy || 0,
        completedMaterialIds: completedIds,
        preferredThemes: preferredThemes || [],
      })
      setRecommendations(recs)
    }).catch(() => {})
  }, [materials, readingLevel, avgAccuracy, preferredThemes])

  const themeIcon = (t: Theme) => THEMES.find(th => th.key === t)?.icon || '📖'

  return (
    <div className="space-y-5">
      {/* Theme filter — horizontal scroll */}
      <div>
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Topic</p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none">
          <button
            onClick={() => setTheme(null)}
            className={`shrink-0 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
              theme === null
                ? 'bg-foreground text-background shadow-md'
                : 'bg-white border border-border text-muted hover:border-border-active'
            }`}
          >
            All Topics
          </button>
          {THEMES.map(t => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className={`shrink-0 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                theme === t.key
                  ? 'bg-foreground text-background shadow-md'
                  : preferredThemes?.includes(t.key)
                    ? 'bg-orange-50 border border-orange-200 text-orange-700'
                    : 'bg-white border border-border text-muted hover:border-border-active'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Level filter */}
      <div>
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Level</p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none">
          <button
            onClick={() => setDifficulty(null)}
            className={`shrink-0 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
              difficulty === null
                ? 'bg-foreground text-background shadow-md'
                : 'bg-white border border-border text-muted hover:border-border-active'
            }`}
          >
            All
          </button>
          {Object.entries(LEVEL_CONFIG).map(([level, config]) => (
            <button
              key={level}
              onClick={() => setDifficulty(parseInt(level))}
              className={`shrink-0 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                difficulty === parseInt(level)
                  ? 'bg-foreground text-background shadow-md'
                  : 'bg-white border border-border text-muted hover:border-border-active'
              }`}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Material cards */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-5 rounded-2xl border border-border bg-white animate-pulse">
              <div className="h-5 w-32 bg-gray-200 rounded-lg mb-3" />
              <div className="h-4 w-full bg-gray-100 rounded-lg mb-2" />
              <div className="h-4 w-2/3 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Recommended for you */}
          {recommendations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-foreground mb-2">Recommended for You</h3>
              <div className="space-y-2">
                {recommendations.map((rec) => {
                  const config = LEVEL_CONFIG[rec.material.difficulty] || LEVEL_CONFIG[1]
                  return (
                    <button
                      key={rec.material.id}
                      onClick={() => onSelect(rec.material)}
                      className={`w-full text-left p-4 rounded-2xl border-2 border-accent/20 bg-accent/5 hover:border-accent/40 transition-all active:scale-[0.98]`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">{themeIcon(rec.material.theme)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold text-foreground truncate">{rec.material.title}</h3>
                            <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                              {config.icon} {config.label}
                            </span>
                          </div>
                          <p className="text-xs text-accent font-semibold">{rec.reason}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {materials.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📚</p>
              <p className="text-muted font-medium">No readings found</p>
              <button
                onClick={() => { setDifficulty(null); setTheme(null) }}
                className="mt-3 text-sm text-accent font-semibold"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {materials.map((m, index) => {
                const config = LEVEL_CONFIG[m.difficulty] || LEVEL_CONFIG[1]
                const paragraphCount = m.paragraphs?.length || 1
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelect(m)}
                    className={`text-left p-4 sm:p-5 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                      selected?.id === m.id
                        ? `${config.bg} ring-2 ring-offset-2 ring-current ${config.color}`
                        : 'bg-white border-border hover:border-border-active hover:shadow-sm'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl sm:text-3xl mt-0.5">{themeIcon(m.theme)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h3 className="font-bold text-base sm:text-lg text-foreground truncate">
                            {m.title}
                          </h3>
                          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}>
                            {config.icon} {config.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted line-clamp-2 leading-relaxed">
                          {m.paragraphs?.[0]?.text || m.content}
                        </p>
                        <div className="mt-2 flex gap-3 text-xs text-muted">
                          <span>{m.word_count} words</span>
                          <span>{paragraphCount} paragraphs</span>
                        </div>
                        {savedMaterialId === m.id && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                            <svg className="size-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            Resume reading
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
