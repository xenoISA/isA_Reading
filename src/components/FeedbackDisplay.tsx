'use client'

import type { LLMAssessment, PronunciationResult } from '@/types'

interface Props {
  assessment: LLMAssessment
  pronunciation?: PronunciationResult | null
  targetText: string
  studentText: string
  onRetry?: () => void
}

function ScoreRing({ score, label, size = 'lg' }: { score: number; label: string; size?: 'lg' | 'sm' }) {
  const radius = size === 'lg' ? 54 : 32
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const viewBox = size === 'lg' ? 120 : 76
  const center = viewBox / 2
  const strokeWidth = size === 'lg' ? 8 : 5

  const color =
    score >= 90 ? '#22c55e' :
    score >= 70 ? '#3b82f6' :
    score >= 50 ? '#f59e0b' :
    '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${size === 'lg' ? 'size-32 sm:size-36' : 'size-16 sm:size-20'}`}>
        <svg className="size-full -rotate-90" viewBox={`0 0 ${viewBox} ${viewBox}`}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#f0e6d8" strokeWidth={strokeWidth} />
          <circle
            cx={center} cy={center} r={radius} fill="none"
            stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold tabular-nums ${size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-sm sm:text-base'}`} style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <p className={`font-medium ${size === 'lg' ? 'text-base' : 'text-[10px] sm:text-xs'} text-muted`}>{label}</p>
    </div>
  )
}

const PACE_LABELS: Record<string, { label: string; color: string }> = {
  'too-slow': { label: 'Very Slow', color: 'text-amber-600' },
  'slow': { label: 'A Bit Slow', color: 'text-amber-500' },
  'good': { label: 'Great Pace!', color: 'text-green-600' },
  'fast': { label: 'A Bit Fast', color: 'text-blue-500' },
  'too-fast': { label: 'Too Fast', color: 'text-red-500' },
}

export default function FeedbackDisplay({ assessment, pronunciation, targetText, studentText, onRetry }: Props) {
  const mainScore = pronunciation?.overall_score ?? assessment.accuracy_score
  const mainLabel =
    mainScore >= 90 ? 'Amazing!' :
    mainScore >= 70 ? 'Great job!' :
    mainScore >= 50 ? 'Good try!' :
    'Keep going!'

  const mainColor =
    mainScore >= 90 ? '#22c55e' :
    mainScore >= 70 ? '#3b82f6' :
    mainScore >= 50 ? '#f59e0b' :
    '#ef4444'

  return (
    <div className="space-y-5">
      {/* Main score */}
      <div className="text-center animate-score-count">
        <div className="relative inline-block">
          <ScoreRing score={mainScore} label="" />
        </div>
        <p className="text-lg font-bold mt-1" style={{ color: mainColor }}>{mainLabel}</p>
      </div>

      {/* Pronunciation sub-scores — 5 dimensions */}
      {pronunciation && (
        <div className="flex justify-center gap-3 sm:gap-5 flex-wrap">
          <ScoreRing score={pronunciation.pronunciation_score} label="Pronunciation" size="sm" />
          <ScoreRing score={pronunciation.fluency_score} label="Fluency" size="sm" />
          <ScoreRing score={pronunciation.intonation_score} label="Intonation" size="sm" />
          <ScoreRing score={pronunciation.accuracy_score} label="Accuracy" size="sm" />
          <ScoreRing score={pronunciation.completeness_score} label="Completeness" size="sm" />
        </div>
      )}

      {/* Pace indicator */}
      {pronunciation?.pace && (
        <div className="text-center">
          <span className={`text-sm font-semibold ${PACE_LABELS[pronunciation.pace]?.color || 'text-muted'}`}>
            Pace: {PACE_LABELS[pronunciation.pace]?.label || pronunciation.pace}
          </span>
        </div>
      )}

      {/* Encouragement */}
      <div className="text-center text-base text-foreground bg-surface-alt rounded-2xl p-4 border border-border">
        {pronunciation?.encouragement || assessment.encouragement}
      </div>

      {/* Pronunciation details — mispronounced words with phonetic tips */}
      {pronunciation?.mispronounced && pronunciation.mispronounced.length > 0 && (
        <section className="p-4 rounded-2xl border-2 border-rose-200 bg-rose-50">
          <h4 className="font-bold text-rose-700 mb-3 text-sm">Pronunciation Practice</h4>
          <div className="space-y-2">
            {pronunciation.mispronounced.map((w, i) => (
              <div
                key={i}
                className="p-3 bg-white rounded-xl border border-rose-200 animate-scale-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-rose-600">{w.word}</span>
                  <span className="text-xs text-muted">→</span>
                  <span className="text-sm font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded">
                    {w.expected_sounds}
                  </span>
                </div>
                <p className="text-xs text-muted">{w.tip}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fluency feedback */}
      {pronunciation?.fluency_feedback && (
        <section className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-200">
          <h4 className="font-bold text-blue-700 mb-2 text-sm">Reading Flow</h4>
          <p className="text-sm text-blue-900 leading-relaxed">{pronunciation.fluency_feedback}</p>
        </section>
      )}

      {/* Intonation feedback */}
      {pronunciation?.intonation_feedback && (
        <section className="p-4 rounded-2xl bg-teal-50 border-2 border-teal-200">
          <h4 className="font-bold text-teal-700 mb-2 text-sm">Intonation & Expression</h4>
          <p className="text-sm text-teal-900 leading-relaxed">{pronunciation.intonation_feedback}</p>
        </section>
      )}

      {/* Reference comparison */}
      {pronunciation?.reference_comparison && (
        <section className="p-4 rounded-2xl bg-indigo-50 border-2 border-indigo-200">
          <h4 className="font-bold text-indigo-700 mb-2 text-sm">Compared to Model Reading</h4>
          <p className="text-sm text-indigo-900 leading-relaxed">{pronunciation.reference_comparison}</p>
        </section>
      )}

      {/* Pronunciation tips */}
      {pronunciation?.pronunciation_tips && pronunciation.pronunciation_tips.length > 0 && (
        <section className="p-4 rounded-2xl bg-violet-50 border-2 border-violet-200">
          <h4 className="font-bold text-violet-700 mb-2 text-sm">Pronunciation Tips</h4>
          <ul className="space-y-1.5">
            {pronunciation.pronunciation_tips.map((tip, i) => (
              <li key={i} className="text-sm text-violet-900 flex gap-2">
                <span className="text-violet-400 shrink-0">*</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Text comparison (collapsed if pronunciation available) */}
      <details className={pronunciation ? 'group' : ''} open={!pronunciation}>
        <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground mb-3">
          {pronunciation ? 'Show text comparison' : 'Text Comparison'}
        </summary>
        <div className="grid gap-3">
          <div className="p-4 rounded-2xl bg-white border border-border">
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Target Text</h4>
            <p className="text-sm text-foreground leading-relaxed text-pretty">{targetText}</p>
          </div>
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
            <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">Your Reading</h4>
            <p className="text-sm text-foreground leading-relaxed text-pretty">{studentText}</p>
          </div>
        </div>
      </details>

      {/* Skipped words (from text assessment) */}
      {!pronunciation && assessment.skipped_words.length > 0 && (
        <section className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50">
          <h4 className="font-bold text-amber-700 mb-3 text-sm">Skipped Words</h4>
          <div className="flex flex-wrap gap-2">
            {assessment.skipped_words.map((w, i) => (
              <span key={i} className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-sm text-amber-700 font-medium">{w}</span>
            ))}
          </div>
        </section>
      )}

      {/* Text assessment tips (shown when no pronunciation analysis) */}
      {!pronunciation && (
        <section className="p-4 rounded-2xl bg-green-50 border-2 border-green-200">
          <h4 className="font-bold text-green-700 mb-2 text-sm">Tips</h4>
          <p className="text-sm text-green-900 leading-relaxed text-pretty">{assessment.feedback}</p>
        </section>
      )}

      {/* Actions */}
      {onRetry && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={onRetry}
            className="w-full sm:w-auto px-8 py-4 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold text-base transition-all active:scale-95 shadow-md"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
