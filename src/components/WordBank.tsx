'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { VocabEntry } from '@/lib/growth/spaced-rep'

type Filter = 'all' | 'due' | 'learning' | 'mastered'

interface Props {
  onStartReview?: (words: { word: string; tip: string }[]) => void
}

export default function WordBank({ onStartReview }: Props) {
  const [queue, setQueue] = useState<VocabEntry[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [playingWord, setPlayingWord] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    import('@/lib/growth/spaced-rep').then(({ loadVocabQueue }) => {
      setQueue(loadVocabQueue())
    })
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const filtered = queue.filter(entry => {
    // Search filter
    if (search && !entry.word.toLowerCase().includes(search.toLowerCase())) return false
    // Category filter
    switch (filter) {
      case 'due': return entry.nextReview <= today
      case 'learning': return entry.box >= 0 && entry.box <= 2
      case 'mastered': return entry.box >= 3
      default: return true
    }
  }).sort((a, b) => {
    // Due first, then by box ascending (weakest first)
    const aDue = a.nextReview <= today ? 0 : 1
    const bDue = b.nextReview <= today ? 0 : 1
    if (aDue !== bDue) return aDue - bDue
    return a.box - b.box
  })

  const dueCount = queue.filter(e => e.nextReview <= today).length

  const playWord = useCallback(async (word: string) => {
    setPlayingWord(word)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        if (audioRef.current) audioRef.current.pause()
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => setPlayingWord(null)
        audio.play()
      } else {
        const u = new SpeechSynthesisUtterance(word)
        u.lang = 'en-US'; u.rate = 0.85
        u.onend = () => setPlayingWord(null)
        speechSynthesis.speak(u)
      }
    } catch {
      const u = new SpeechSynthesisUtterance(word)
      u.lang = 'en-US'; u.rate = 0.85
      u.onend = () => setPlayingWord(null)
      speechSynthesis.speak(u)
    }
  }, [])

  const handleStartReview = useCallback(() => {
    if (!onStartReview) return
    import('@/lib/growth/spaced-rep').then(({ getDueWords }) => {
      const due = getDueWords()
      if (due.length > 0) {
        onStartReview(due.map(d => ({ word: d.word, tip: d.tip })))
      }
    })
  }, [onStartReview])

  // Leitner box visualization: 5 dots
  const BoxDots = ({ box }: { box: number }) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`size-2 rounded-full ${
            i <= box
              ? box >= 3 ? 'bg-green-400' : box >= 1 ? 'bg-amber-400' : 'bg-red-400'
              : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )

  if (queue.length === 0) {
    return (
      <div className="text-center py-16 animate-scale-in">
        <p className="text-5xl mb-4">📚</p>
        <h2 className="text-xl font-bold text-foreground mb-2">Your Word Bank is empty</h2>
        <p className="text-muted text-sm">Read some stories to start building your vocabulary!</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-scale-in pb-20">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Word Bank</h2>
        <p className="text-muted text-sm">{queue.length} words collected</p>
      </div>

      {/* Review due words CTA */}
      {dueCount > 0 && onStartReview && (
        <button
          onClick={handleStartReview}
          className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold text-base transition-all active:scale-95 shadow-md"
        >
          <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
          Review {dueCount} Due Word{dueCount !== 1 ? 's' : ''}
        </button>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search words..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-surface text-foreground placeholder:text-muted focus:border-accent focus:outline-none text-sm"
      />

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {([
          { key: 'all', label: 'All' },
          { key: 'due', label: `Due (${dueCount})` },
          { key: 'learning', label: 'Learning' },
          { key: 'mastered', label: 'Mastered' },
        ] as { key: Filter; label: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
              filter === f.key
                ? 'bg-foreground text-background shadow-md'
                : 'bg-white border border-border text-muted hover:border-border-active'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Word list */}
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted text-sm">No words match your filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry, i) => {
            const isDue = entry.nextReview <= today
            return (
              <button
                key={`${entry.word}-${i}`}
                onClick={() => playWord(entry.word)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                  isDue ? 'border-accent/30 bg-accent/5' : 'border-border bg-white'
                } ${playingWord === entry.word ? 'ring-2 ring-accent ring-offset-1' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {playingWord === entry.word ? (
                        <div className="size-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <svg className="size-4 text-muted shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                        </svg>
                      )}
                      <span className="font-bold text-foreground">{entry.word}</span>
                      {isDue && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/20 text-accent">DUE</span>
                      )}
                    </div>
                    <p className="text-xs text-muted mb-1">{entry.tip}</p>
                    {entry.contextSentence && (
                      <p className="text-xs text-muted/70 italic line-clamp-1">&ldquo;{entry.contextSentence}&rdquo;</p>
                    )}
                    {entry.sourceMaterial && (
                      <p className="text-[10px] text-muted/50 mt-1">from: {entry.sourceMaterial}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <BoxDots box={entry.box} />
                    <span className="text-[10px] text-muted">
                      {entry.box >= 4 ? 'Mastered' : entry.box >= 1 ? `Box ${entry.box + 1}` : 'New'}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
