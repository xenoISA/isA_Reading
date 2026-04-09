const READING_HISTORY_KEY = 'isa-reading-history'
const MAX_ATTEMPTS = 10

export interface ReadingAttempt {
  date: string
  avgScore: number
  paragraphScores: number[]
}

interface ReadingHistory {
  [materialId: string]: {
    title: string
    attempts: ReadingAttempt[]
  }
}

function loadHistory(): ReadingHistory {
  try {
    const raw = localStorage.getItem(READING_HISTORY_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch { return {} }
}

function saveHistory(history: ReadingHistory): void {
  try {
    localStorage.setItem(READING_HISTORY_KEY, JSON.stringify(history))
  } catch {}
}

export function saveAttempt(materialId: string, title: string, paragraphScores: number[]): void {
  const history = loadHistory()
  if (!history[materialId]) {
    history[materialId] = { title, attempts: [] }
  }
  const avgScore = paragraphScores.length > 0
    ? Math.round(paragraphScores.reduce((a, b) => a + b, 0) / paragraphScores.length)
    : 0
  history[materialId].attempts.push({
    date: new Date().toISOString().split('T')[0],
    avgScore,
    paragraphScores,
  })
  // Keep last N attempts
  if (history[materialId].attempts.length > MAX_ATTEMPTS) {
    history[materialId].attempts = history[materialId].attempts.slice(-MAX_ATTEMPTS)
  }
  saveHistory(history)
}

export function getHistory(materialId: string): ReadingAttempt[] {
  const history = loadHistory()
  return history[materialId]?.attempts || []
}

export function getPreviousBest(materialId: string): number | null {
  const attempts = getHistory(materialId)
  if (attempts.length === 0) return null
  return Math.max(...attempts.map(a => a.avgScore))
}

export function getImprovement(materialId: string, currentScore: number): { previousBest: number; delta: number } | null {
  const prev = getPreviousBest(materialId)
  if (prev === null) return null
  return { previousBest: prev, delta: currentScore - prev }
}

export function getCompletedMaterialIds(): string[] {
  return Object.keys(loadHistory())
}
