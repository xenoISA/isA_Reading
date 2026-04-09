'use client'

import { useState, useEffect } from 'react'
import { THEMES, type Theme } from '@/types'

interface Props {
  onComplete: (themes: Theme[], goal?: string) => void
}

const GOALS = [
  { key: 'fluency', icon: '\uD83D\uDDE3\uFE0F', label: 'Read better' },
  { key: 'vocabulary', icon: '\uD83D\uDCDA', label: 'Learn new words' },
  { key: 'fun', icon: '\u2B50', label: 'Have fun!' },
]

export default function ThemePicker({ onComplete }: Props) {
  const [selected, setSelected] = useState<Theme[]>([])
  const [goal, setGoal] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('isa-reading-themes')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Theme[]
        if (parsed.length > 0) {
          onComplete(parsed)
        }
      } catch { /* ignore */ }
    }
  }, [onComplete])

  const toggle = (theme: Theme) => {
    setSelected(prev =>
      prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]
    )
  }

  const handleContinue = () => {
    const themes = selected.length > 0 ? selected : THEMES.map(t => t.key)
    localStorage.setItem('isa-reading-themes', JSON.stringify(themes))
    if (goal) localStorage.setItem('isa-reading-goal', goal)
    onComplete(themes, goal || undefined)
  }

  return (
    <div className="animate-scale-in space-y-6">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-balance">
          What do you like to read about?
        </h2>
        <p className="text-muted mt-2">Pick your favorite topics</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {THEMES.map(theme => {
          const isSelected = selected.includes(theme.key)
          return (
            <button
              key={theme.key}
              onClick={() => toggle(theme.key)}
              className={`p-4 rounded-2xl border-2 transition-all active:scale-95 flex flex-col items-center gap-2 ${
                isSelected
                  ? 'border-accent bg-orange-50 shadow-sm'
                  : 'border-border bg-white hover:border-border-active'
              }`}
            >
              <span className="text-3xl">{theme.icon}</span>
              <span className={`text-sm font-semibold ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                {theme.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Reading goal */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground text-center">What&apos;s your reading goal?</p>
        <div className="flex gap-3">
          {GOALS.map(g => {
            const isSelected = goal === g.key
            return (
              <button
                key={g.key}
                onClick={() => setGoal(g.key)}
                className={`flex-1 p-3 rounded-2xl border-2 transition-all active:scale-95 flex flex-col items-center gap-1 ${
                  isSelected
                    ? 'border-accent bg-orange-50 shadow-sm'
                    : 'border-border bg-white hover:border-border-active'
                }`}
              >
                <span className="text-2xl">{g.icon}</span>
                <span className={`text-xs font-semibold ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                  {g.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleContinue}
        className="w-full py-4 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold text-base transition-all active:scale-95 shadow-md"
      >
        {selected.length > 0 ? `Let's Go! (${selected.length} topics)` : 'Show me everything'}
      </button>
    </div>
  )
}
