// Leitner spaced repetition algorithm
// 5 boxes with increasing intervals

const LEITNER_INTERVALS = [1, 3, 7, 14, 30] // days

export interface VocabEntry {
  word: string
  tip: string
  box: number // 0-4 (Leitner box)
  nextReview: string // ISO date string
  addedAt: string
  lastReviewed?: string
  contextSentence?: string
  sourceMaterial?: string
  sourceTheme?: string
}

const VOCAB_STORAGE_KEY = 'isa-reading-vocab-queue'

export function loadVocabQueue(): VocabEntry[] {
  try {
    const raw = localStorage.getItem(VOCAB_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch { return [] }
}

export function saveVocabQueue(queue: VocabEntry[]): void {
  try {
    localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(queue))
  } catch { /* localStorage full */ }
}

export function addWordsToQueue(words: { word: string; tip: string; contextSentence?: string; sourceMaterial?: string; sourceTheme?: string }[]): void {
  const queue = loadVocabQueue()
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = getDatePlusDays(today, 1)

  for (const w of words) {
    // Skip if already in queue
    const existing = queue.find(e => e.word.toLowerCase() === w.word.toLowerCase())
    if (existing) {
      // Reset to box 0 if re-encountered
      existing.box = 0
      existing.nextReview = tomorrow
      existing.tip = w.tip
      if (w.contextSentence) existing.contextSentence = w.contextSentence
      if (w.sourceMaterial) existing.sourceMaterial = w.sourceMaterial
      if (w.sourceTheme) existing.sourceTheme = w.sourceTheme
      continue
    }

    queue.push({
      word: w.word,
      tip: w.tip,
      box: 0,
      nextReview: tomorrow,
      addedAt: today,
      contextSentence: w.contextSentence,
      sourceMaterial: w.sourceMaterial,
      sourceTheme: w.sourceTheme,
    })
  }

  saveVocabQueue(queue)
}

export function getDueWords(): VocabEntry[] {
  const queue = loadVocabQueue()
  const today = new Date().toISOString().split('T')[0]
  return queue.filter(e => e.nextReview <= today)
}

export function getMasteredCount(): number {
  const queue = loadVocabQueue()
  return queue.filter(e => e.box >= 4).length
}

export function getQueueStats(): { total: number; due: number; mastered: number } {
  const queue = loadVocabQueue()
  const today = new Date().toISOString().split('T')[0]
  return {
    total: queue.length,
    due: queue.filter(e => e.nextReview <= today).length,
    mastered: queue.filter(e => e.box >= 4).length,
  }
}

export function advanceWord(word: string, correct: boolean): void {
  const queue = loadVocabQueue()
  const entry = queue.find(e => e.word.toLowerCase() === word.toLowerCase())
  if (!entry) return

  const today = new Date().toISOString().split('T')[0]
  entry.lastReviewed = today

  if (correct) {
    entry.box = Math.min(4, entry.box + 1)
  } else {
    entry.box = 0
  }

  const interval = LEITNER_INTERVALS[entry.box]
  entry.nextReview = getDatePlusDays(today, interval)

  saveVocabQueue(queue)
}

function getDatePlusDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
