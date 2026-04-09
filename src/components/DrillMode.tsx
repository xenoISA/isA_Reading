'use client'

import { useState, useCallback } from 'react'
import AudioRecorder from './AudioRecorder'

interface DrillWord {
  word: string
  tip: string
}

interface DrillResult {
  word: string
  attempts: number
  bestScore: number
  passed: boolean
}

interface Props {
  words: DrillWord[]
  onComplete: (results: DrillResult[]) => void
  onSkip: () => void
}

export default function DrillMode({ words, onComplete, onSkip }: Props) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [results, setResults] = useState<DrillResult[]>([])
  const [wordScore, setWordScore] = useState<number | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  const currentWord = words[currentWordIndex]
  const totalWords = words.length

  const handleListenWord = useCallback(async () => {
    if (!currentWord) return
    setTtsLoading(true)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentWord.word }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.play()
      } else {
        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(currentWord.word)
        utterance.lang = 'en-US'
        utterance.rate = 0.8
        speechSynthesis.speak(utterance)
      }
    } catch {
      const utterance = new SpeechSynthesisUtterance(currentWord.word)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    } finally {
      setTtsLoading(false)
    }
  }, [currentWord])

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    if (!currentWord) return
    setScoring(true)

    try {
      // Convert to wav if possible
      let audioBlob = blob
      try {
        const { convertBlobToWav } = await import('@/lib/audio-utils')
        audioBlob = await convertBlobToWav(blob)
      } catch { /* use original blob */ }

      const form = new FormData()
      form.append('audio', audioBlob, audioBlob === blob ? 'recording.webm' : 'recording.wav')
      form.append('target_text', currentWord.word)
      form.append('keywords', JSON.stringify([currentWord.word]))

      const res = await fetch('/api/pronounce', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Scoring failed')

      const result = await res.json()
      const score = result.overall_score ?? 0
      const newAttempts = attempts + 1
      const newBest = Math.max(bestScore, score)

      setWordScore(score)
      setAttempts(newAttempts)
      setBestScore(newBest)

      // Auto-advance after max 2 attempts or pass
      if (score >= 70 || newAttempts >= 2) {
        const drillResult: DrillResult = {
          word: currentWord.word,
          attempts: newAttempts,
          bestScore: newBest,
          passed: newBest >= 70,
        }

        // Wait 2 seconds then advance
        setTimeout(() => {
          advanceToNext(drillResult)
        }, 2000)
      }
    } catch {
      setWordScore(0)
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= 2) {
        const drillResult: DrillResult = {
          word: currentWord.word,
          attempts: newAttempts,
          bestScore,
          passed: false,
        }
        setTimeout(() => advanceToNext(drillResult), 2000)
      }
    } finally {
      setScoring(false)
    }
  }, [currentWord, attempts, bestScore])

  const advanceToNext = useCallback((result: DrillResult) => {
    const newResults = [...results, result]
    setResults(newResults)

    if (currentWordIndex + 1 >= totalWords) {
      // All words done — show summary
      setShowSummary(true)
    } else {
      setCurrentWordIndex(prev => prev + 1)
      setWordScore(null)
      setAttempts(0)
      setBestScore(0)
    }
  }, [results, currentWordIndex, totalWords])

  const handleNextWord = useCallback(() => {
    const drillResult: DrillResult = {
      word: currentWord.word,
      attempts,
      bestScore: Math.max(bestScore, wordScore ?? 0),
      passed: Math.max(bestScore, wordScore ?? 0) >= 70,
    }
    advanceToNext(drillResult)
  }, [currentWord, attempts, bestScore, wordScore, advanceToNext])

  const handleTryAgain = useCallback(() => {
    setWordScore(null)
  }, [])

  // Summary screen
  if (showSummary) {
    const allResults = results
    const mastered = allResults.filter(r => r.passed).length
    const needsPractice = allResults.filter(r => !r.passed).length

    return (
      <div className="space-y-6 animate-scale-in">
        <div className="text-center">
          <p className="text-4xl mb-3">{mastered === totalWords ? '🎉' : '💪'}</p>
          <h2 className="text-2xl font-bold text-foreground">Drill Complete!</h2>
          <p className="text-muted mt-1">
            {mastered} of {totalWords} words mastered
          </p>
        </div>

        <div className="space-y-2">
          {allResults.map((r, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                r.passed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{r.passed ? '✅' : '🔄'}</span>
                <span className="font-semibold text-foreground">{r.word}</span>
              </div>
              <span className={`text-sm font-bold ${r.passed ? 'text-green-600' : 'text-orange-600'}`}>
                {r.bestScore}%
              </span>
            </div>
          ))}
        </div>

        {needsPractice > 0 && (
          <p className="text-center text-sm text-muted">
            Words you missed will be added to your review queue for later practice.
          </p>
        )}

        <div className="flex justify-center">
          <button
            onClick={() => onComplete(allResults)}
            className="px-8 py-4 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold text-base transition-all active:scale-95 shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-scale-in">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Word {currentWordIndex + 1} of {totalWords}</span>
          <button
            onClick={onSkip}
            className="text-muted hover:text-foreground font-medium transition-colors"
          >
            Skip Drill
          </button>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentWordIndex) / totalWords) * 100}%` }}
          />
        </div>
      </div>

      {/* Word display */}
      <div className="text-center py-6 space-y-3">
        <p className="text-4xl sm:text-5xl font-bold text-foreground">{currentWord.word}</p>
        <p className="text-sm text-muted">{currentWord.tip}</p>
      </div>

      {/* Listen button */}
      <div className="flex justify-center">
        <button
          onClick={handleListenWord}
          disabled={ttsLoading}
          className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-2xl font-bold text-sm transition-all active:scale-95"
        >
          {ttsLoading ? (
            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
          )}
          Listen
        </button>
      </div>

      {/* Score display (after recording) */}
      {wordScore !== null && !scoring && (
        <div className="text-center animate-scale-in">
          <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-lg ${
            wordScore >= 70
              ? 'bg-green-50 text-green-600 border-2 border-green-200'
              : 'bg-orange-50 text-orange-600 border-2 border-orange-200'
          }`}>
            {wordScore >= 70 ? '✅' : '🔄'}
            <span>{wordScore}%</span>
          </div>
          {wordScore >= 70 && (
            <p className="text-sm text-green-600 mt-2 font-medium">Great pronunciation!</p>
          )}
          {wordScore < 70 && attempts < 2 && (
            <p className="text-sm text-orange-600 mt-2 font-medium">Try one more time!</p>
          )}
          {wordScore < 70 && attempts >= 2 && (
            <p className="text-sm text-orange-600 mt-2 font-medium">Moving to next word...</p>
          )}
        </div>
      )}

      {/* Scoring spinner */}
      {scoring && (
        <div className="text-center py-4">
          <div className="size-8 border-3 border-violet-200 border-t-violet-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted mt-2">Checking pronunciation...</p>
        </div>
      )}

      {/* Audio recorder — show when no score yet or trying again */}
      {wordScore === null && !scoring && (
        <AudioRecorder onRecordingComplete={handleRecordingComplete} />
      )}

      {/* Action buttons after scoring */}
      {wordScore !== null && !scoring && (
        <div className="flex justify-center gap-3">
          {wordScore < 70 && attempts < 2 && (
            <button
              onClick={handleTryAgain}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm transition-all active:scale-95"
            >
              Try Again
            </button>
          )}
          <button
            onClick={handleNextWord}
            className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-2xl font-bold text-sm transition-all active:scale-95"
          >
            {currentWordIndex + 1 >= totalWords ? 'See Results' : 'Next Word'}
          </button>
        </div>
      )}
    </div>
  )
}
