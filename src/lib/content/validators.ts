import type { Paragraph } from '@/types'

export interface ValidationResult {
  passed: boolean
  score: number
  issues: string[]
}

export interface QualityReport {
  readability: ValidationResult
  keywords: ValidationResult
  safety: ValidationResult
  paragraphLength: ValidationResult
  overall: { passed: boolean; score: number }
}

// Flesch-Kincaid Grade Level (simplified)
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (word.length <= 3) return 1

  let count = 0
  const vowels = 'aeiouy'
  let prevVowel = false

  for (const char of word) {
    const isVowel = vowels.includes(char)
    if (isVowel && !prevVowel) count++
    prevVowel = isVowel
  }

  // Adjust for silent e
  if (word.endsWith('e') && count > 1) count--
  // Adjust for -le endings
  if (word.endsWith('le') && word.length > 2 && !vowels.includes(word[word.length - 3])) count++

  return Math.max(1, count)
}

export function calculateReadability(text: string): { gradeLevel: number; score: number } {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0)

  if (sentences.length === 0 || words.length === 0) {
    return { gradeLevel: 0, score: 100 }
  }

  const wordsPerSentence = words.length / sentences.length
  const syllablesPerWord = syllables / words.length

  // Flesch-Kincaid Grade Level
  const gradeLevel = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59

  // Flesch Reading Ease (0-100, higher = easier)
  const score = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord

  return {
    gradeLevel: Math.max(0, Math.round(gradeLevel * 10) / 10),
    score: Math.max(0, Math.min(100, Math.round(score * 10) / 10)),
  }
}

// Expected grade level ranges per difficulty
const EXPECTED_GRADES: Record<number, [number, number]> = {
  1: [0, 3],
  2: [1, 4],
  3: [3, 6],
  4: [5, 8],
  5: [7, 12],
}

export function validateReadability(text: string, difficulty: number): ValidationResult {
  const { gradeLevel, score } = calculateReadability(text)
  const [minGrade, maxGrade] = EXPECTED_GRADES[difficulty] || [0, 12]
  const issues: string[] = []

  if (gradeLevel < minGrade) {
    issues.push(`Text too simple (grade ${gradeLevel}, expected ${minGrade}-${maxGrade})`)
  }
  if (gradeLevel > maxGrade + 2) { // allow 2 grades of slack
    issues.push(`Text too complex (grade ${gradeLevel}, expected ${minGrade}-${maxGrade})`)
  }

  return {
    passed: issues.length === 0,
    score,
    issues,
  }
}

// Keyword quality validation
export function validateKeywords(paragraphs: Paragraph[], difficulty: number): ValidationResult {
  const issues: string[] = []
  let validCount = 0
  let totalKeywords = 0

  const STOP_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'but', 'or', 'it', 'in', 'on', 'to', 'for', 'of'])

  for (const p of paragraphs) {
    totalKeywords += p.keywords.length

    if (p.keywords.length < 2) {
      issues.push(`Paragraph ${p.index + 1}: too few keywords (${p.keywords.length}, need at least 2)`)
    }

    for (const kw of p.keywords) {
      if (STOP_WORDS.has(kw.toLowerCase())) {
        issues.push(`Paragraph ${p.index + 1}: "${kw}" is a stop word — not a good keyword`)
      } else if (kw.length < 3) {
        issues.push(`Paragraph ${p.index + 1}: "${kw}" is too short`)
      } else if (!p.text.toLowerCase().includes(kw.toLowerCase())) {
        issues.push(`Paragraph ${p.index + 1}: "${kw}" not found in paragraph text`)
      } else {
        validCount++
      }
    }
  }

  const score = totalKeywords > 0 ? Math.round((validCount / totalKeywords) * 100) : 0

  return {
    passed: score >= 70,
    score,
    issues,
  }
}

// Content safety check (basic)
export function validateSafety(text: string): ValidationResult {
  const issues: string[] = []
  const lowerText = text.toLowerCase()

  const unsafePatterns = [
    { pattern: /\b(kill|murder|death|die|dead|blood|gore)\b/gi, reason: 'violence' },
    { pattern: /\b(sex|naked|nude|drug|alcohol|beer|wine|cigarette)\b/gi, reason: 'inappropriate content' },
    { pattern: /\b(stupid|idiot|dumb|ugly|fat|hate)\b/gi, reason: 'negative language' },
    { pattern: /\b(gun|weapon|bomb|shoot|stab)\b/gi, reason: 'weapons' },
  ]

  for (const { pattern, reason } of unsafePatterns) {
    const matches = lowerText.match(pattern)
    if (matches) {
      issues.push(`Contains ${reason}: "${matches[0]}"`)
    }
  }

  return {
    passed: issues.length === 0,
    score: issues.length === 0 ? 100 : 0,
    issues,
  }
}

// Paragraph length validation
export function validateParagraphLength(paragraphs: Paragraph[]): ValidationResult {
  const issues: string[] = []
  let passedCount = 0

  for (const p of paragraphs) {
    const sentences = p.text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const words = p.text.split(/\s+/).filter(w => w.length > 0)
    const sentenceCount = sentences.length
    const wordCount = words.length

    const meetsMinimum = sentenceCount >= 3 || wordCount >= 50

    if (!meetsMinimum) {
      issues.push(
        `Paragraph ${p.index + 1}: too short (${sentenceCount} sentence${sentenceCount !== 1 ? 's' : ''}, ${wordCount} words — need at least 3 sentences or 50 words)`
      )
    } else {
      passedCount++
    }
  }

  const total = paragraphs.length
  const score = total > 0 ? Math.round((passedCount / total) * 100) : 100

  return {
    passed: issues.length === 0,
    score,
    issues,
  }
}

// Full quality report
export function validateMaterial(
  text: string,
  paragraphs: Paragraph[],
  difficulty: number
): QualityReport {
  const readability = validateReadability(text, difficulty)
  const keywords = validateKeywords(paragraphs, difficulty)
  const safety = validateSafety(text)
  const paragraphLength = validateParagraphLength(paragraphs)

  const overallScore = Math.round(
    (readability.score * 0.25 + keywords.score * 0.3 + safety.score * 0.25 + paragraphLength.score * 0.2)
  )

  return {
    readability,
    keywords,
    safety,
    paragraphLength,
    overall: {
      passed: readability.passed && keywords.passed && safety.passed && paragraphLength.passed,
      score: overallScore,
    },
  }
}
