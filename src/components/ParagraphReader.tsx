'use client'

import type { Paragraph, ParagraphProgress, LLMAssessment, PronunciationResult } from '@/types'
import AudioRecorder from './AudioRecorder'
import FeedbackDisplay from './FeedbackDisplay'

interface Props {
  paragraphs: Paragraph[]
  currentIndex: number
  progress: ParagraphProgress[]
  step: 'reading' | 'recording' | 'processing' | 'feedback'
  processingStage?: 'transcribing' | 'analyzing' | 'scoring'
  assessment: LLMAssessment | null
  pronunciation: PronunciationResult | null
  studentText: string
  ttsLoading: boolean
  ttsPlaying: boolean
  onPlayParagraph: () => void
  onStartRecording: () => void
  onRecordingComplete: (blob: Blob) => void
  onRetryParagraph: () => void
  onNextParagraph: () => void
  onPrevParagraph: () => void
  onStartDrill?: () => void
}

function HighlightedText({ text, keywords }: { text: string; keywords: string[] }) {
  if (!keywords.length) return <>{text}</>

  const pattern = new RegExp(`\\b(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')
  const parts = text.split(pattern)

  return (
    <>
      {parts.map((part, i) => {
        const isKeyword = keywords.some(k => k.toLowerCase() === part.toLowerCase())
        return isKeyword ? (
          <mark
            key={i}
            className="bg-amber-100 text-amber-900 rounded px-0.5 font-semibold"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </>
  )
}

function ParagraphNav({ total, current, progress }: { total: number; current: number; progress: ParagraphProgress[] }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const p = progress[i]
        const isCurrent = i === current
        const isDone = p?.status === 'completed'
        const score = p?.accuracy_score

        return (
          <div
            key={i}
            className={`size-3 rounded-full transition-all ${
              isCurrent
                ? 'size-4 ring-2 ring-accent ring-offset-1 bg-accent'
                : isDone
                  ? score && score >= 70 ? 'bg-green-400' : 'bg-amber-400'
                  : 'bg-gray-200'
            }`}
            title={`Paragraph ${i + 1}${isDone && score ? ` — ${score}%` : ''}`}
          />
        )
      })}
    </div>
  )
}

export default function ParagraphReader({
  paragraphs,
  currentIndex,
  progress,
  step,
  processingStage,
  assessment,
  pronunciation,
  studentText,
  ttsLoading,
  ttsPlaying,
  onPlayParagraph,
  onStartRecording,
  onRecordingComplete,
  onRetryParagraph,
  onNextParagraph,
  onPrevParagraph,
  onStartDrill,
}: Props) {
  const paragraph = paragraphs[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === paragraphs.length - 1
  const currentProgress = progress[currentIndex]

  return (
    <div className="space-y-5 animate-scale-in">
      {/* Paragraph progress dots + controls */}
      <div className="space-y-2">
        <ParagraphNav total={paragraphs.length} current={currentIndex} progress={progress} />
        <p className="text-center text-xs text-muted">
          Paragraph {currentIndex + 1} of {paragraphs.length}
        </p>
      </div>

      {/* === Reading step === */}
      {step === 'reading' && (
        <>
          {/* Paragraph text with highlighted keywords */}
          <div className="p-5 sm:p-6 bg-surface rounded-2xl border-2 border-border">
            <p className="text-lg sm:text-xl leading-relaxed sm:leading-loose text-foreground text-pretty">
              <HighlightedText text={paragraph.text} keywords={paragraph.keywords} />
            </p>
          </div>

          {/* Vocabulary words */}
          {paragraph.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {paragraph.keywords.map(word => (
                <span key={word} className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-800">
                  {word}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onPlayParagraph}
              disabled={ttsLoading || ttsPlaying}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-2xl font-bold text-base transition-all active:scale-95"
            >
              {ttsLoading ? (
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                </svg>
              )}
              <span>{ttsPlaying ? 'Playing...' : 'Listen'}</span>
            </button>
            <button
              onClick={onStartRecording}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-4 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold text-base transition-all active:scale-95"
            >
              <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              <span>Read This Paragraph</span>
            </button>
          </div>

          {/* Paragraph navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={onPrevParagraph}
              disabled={isFirst}
              className="text-sm text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Previous
            </button>
            {currentProgress?.status === 'completed' && (
              <button
                onClick={onNextParagraph}
                disabled={isLast}
                className="text-sm text-accent hover:text-accent-hover disabled:opacity-30 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                Skip to next
              </button>
            )}
            <div />
          </div>
        </>
      )}

      {/* === Recording step === */}
      {step === 'recording' && (
        <>
          <div className="p-4 bg-surface rounded-2xl border border-border">
            <p className="text-base leading-relaxed text-foreground text-pretty">
              <HighlightedText text={paragraph.text} keywords={paragraph.keywords} />
            </p>
          </div>
          <AudioRecorder onRecordingComplete={onRecordingComplete} />
        </>
      )}

      {/* === Processing step === */}
      {step === 'processing' && (
        <div className="text-center py-12 space-y-6">
          <div className="relative mx-auto size-16">
            <div className="absolute inset-0 rounded-full border-4 border-border" />
            <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          </div>
          <div className="space-y-4">
            <p className="text-lg font-bold text-foreground">Checking paragraph {currentIndex + 1}...</p>
            <div className="flex flex-col items-center gap-2 text-sm">
              <span className={processingStage === 'transcribing' ? 'text-accent font-semibold' : 'text-green-600'}>
                {processingStage === 'transcribing' ? '\u23F3' : '\u2713'} Transcribing your reading...
              </span>
              <span className={
                processingStage === 'analyzing' ? 'text-accent font-semibold' :
                processingStage === 'scoring' ? 'text-green-600' : 'text-muted'
              }>
                {processingStage === 'scoring' || processingStage === 'analyzing' ? (processingStage === 'scoring' ? '\u2713' : '\u23F3') : '\u25CB'} Analyzing pronunciation...
              </span>
              <span className={processingStage === 'scoring' ? 'text-accent font-semibold' : 'text-muted'}>
                {processingStage === 'scoring' ? '\u23F3' : '\u25CB'} Generating feedback...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* === Feedback step === */}
      {step === 'feedback' && assessment && (
        <>
          <FeedbackDisplay
            assessment={assessment}
            pronunciation={pronunciation}
            targetText={paragraph.text}
            studentText={studentText}
            onRetry={onRetryParagraph}
            onStartDrill={onStartDrill}
          />

          {/* Next paragraph button */}
          {!isLast && (
            <div className="flex justify-center pt-2">
              <button
                onClick={onNextParagraph}
                className="w-full sm:w-auto px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-base transition-all active:scale-95 shadow-md"
              >
                Next Paragraph ({currentIndex + 2} of {paragraphs.length})
              </button>
            </div>
          )}

          {isLast && (
            <div className="text-center py-4">
              <p className="text-lg font-bold text-green-600">You finished the whole reading!</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
