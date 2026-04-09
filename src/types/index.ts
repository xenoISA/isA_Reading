// === Domain Types ===

export type Theme = 'animals' | 'adventure' | 'science' | 'fantasy' | 'sports' | 'daily-life' | 'nature' | 'history'

export const THEMES: { key: Theme; label: string; icon: string }[] = [
  { key: 'animals', label: 'Animals', icon: '🐾' },
  { key: 'adventure', label: 'Adventure', icon: '🗺️' },
  { key: 'science', label: 'Science', icon: '🔬' },
  { key: 'fantasy', label: 'Fantasy', icon: '🧙' },
  { key: 'sports', label: 'Sports', icon: '⚽' },
  { key: 'daily-life', label: 'Daily Life', icon: '🏠' },
  { key: 'nature', label: 'Nature', icon: '🌲' },
  { key: 'history', label: 'History', icon: '🏛️' },
]

export interface Paragraph {
  index: number
  text: string
  keywords: string[] // 2-5 vocabulary words to focus on
}

export interface Material {
  id: string
  title: string
  content: string // full text (for backward compat + TTS of whole passage)
  paragraphs: Paragraph[] // structured content
  difficulty: number // 1-5
  theme: Theme
  domain: string // kept for backward compat, same as theme display
  word_count: number
  audio_url?: string
  source?: string
  created_at: string
}

export interface ParagraphProgress {
  paragraph_index: number
  status: 'pending' | 'completed'
  accuracy_score?: number
  transcript?: string
  assessment?: LLMAssessment
}

export interface ReadingSession {
  id: string
  material_id: string
  status: 'selecting' | 'listening' | 'recording' | 'transcribing' | 'assessing' | 'reviewed' | 'completed'
  current_paragraph: number
  paragraph_progress: ParagraphProgress[]
  transcript?: Transcript
  assessment?: Assessment
  created_at: string
}

export interface Recording {
  id: string
  session_id: string
  material_id: string
  audio_url: string
  duration_seconds: number
  created_at: string
}

export interface Transcript {
  text: string
  words?: TranscriptWord[]
  language: string
  duration: number
}

export interface TranscriptWord {
  word: string
  start: number
  end: number
}

export interface Assessment {
  id: string
  session_id: string
  material_id: string
  target_text: string
  student_text: string
  accuracy_score: number // 0-100
  mispronounced_words: MispronounceDetail[]
  skipped_words: string[]
  added_words: string[]
  feedback: string
  encouragement: string
  model_used: string
  evaluated_at: string
  paragraph_index?: number
}

export interface MispronounceDetail {
  expected: string
  actual: string
  position: number
}

// === Provider Types ===

export interface TTSOptions {
  voice?: string
  speed?: number
  model?: string
}

export interface TTSProvider {
  readonly name: string
  synthesize(text: string, options?: TTSOptions): Promise<ArrayBuffer>
}

export interface STTOptions {
  language?: string
  model?: string
}

export interface TranscriptResult {
  text: string
  words?: TranscriptWord[]
  language: string
  duration: number
}

export interface STTProvider {
  readonly name: string
  transcribe(audio: Blob | File, options?: STTOptions): Promise<TranscriptResult>
}

export interface LLMProvider {
  readonly name: string
  assess(targetText: string, studentText: string, context?: AssessmentContext): Promise<LLMAssessment>
}

export interface AssessmentContext {
  difficulty?: number
  domain?: string
  studentAge?: number
  paragraphIndex?: number
  totalParagraphs?: number
  keywords?: string[]
}

export type ErrorCategory = 'sight_word' | 'phoneme' | 'fluency' | 'comprehension' | 'other'

export interface CategorizedError {
  word: string
  category: ErrorCategory
  tip: string
}

export interface LLMAssessment {
  accuracy_score: number
  mispronounced_words: MispronounceDetail[]
  skipped_words: string[]
  added_words: string[]
  feedback: string
  encouragement: string
  keyword_accuracy?: { word: string; correct: boolean }[]
  error_categories?: CategorizedError[]
}

// === User / Profile ===

export interface ChildProfile {
  id: string
  username: string
  display_name?: string
  avatar: string
  age?: number
  grade?: string
  preferred_themes: Theme[]
  reading_level: number
  total_points: number
  current_streak: number
  longest_streak: number
  last_reading_date?: string
  created_at: string
}

export interface Badge {
  id: string
  child_id: string
  badge_key: BadgeKey
  awarded_at: string
}

export type BadgeKey =
  | 'first_reading'
  | 'ten_readings'
  | 'perfect_score'
  | 'streak_7'
  | 'streak_30'
  | 'theme_explorer'
  | 'speedster'
  | 'accuracy_hero'

export const BADGE_DEFS: Record<BadgeKey, { name: string; icon: string; description: string }> = {
  first_reading: { name: 'First Steps', icon: '📖', description: 'Complete your first reading' },
  ten_readings: { name: 'Bookworm', icon: '🐛', description: 'Complete 10 readings' },
  perfect_score: { name: 'Perfect!', icon: '💯', description: 'Get 100% accuracy' },
  streak_7: { name: 'Week Warrior', icon: '🔥', description: 'Read 7 days in a row' },
  streak_30: { name: 'Super Streak', icon: '⚡', description: 'Read 30 days in a row' },
  theme_explorer: { name: 'Explorer', icon: '🗺️', description: 'Read from all 8 themes' },
  speedster: { name: 'Speedster', icon: '🚀', description: 'Earn 50 points' },
  accuracy_hero: { name: 'Accuracy Hero', icon: '🎯', description: 'Average 90%+ across 10 readings' },
}

export interface GrowthMetrics {
  total_readings: number
  avg_accuracy: number
  reading_level: number
  current_streak: number
  longest_streak: number
  total_points: number
  vocabulary_learned: number
  accuracy_trend: { date: string; score: number }[]
  recent_readings: { date: string; title: string; score: number; material_id: string }[]
}

export interface PointsEntry {
  points: number
  reason: string
  created_at: string
}

export interface LeaderboardEntry {
  rank: number
  username: string
  avatar: string
  total_points: number
  badge_count: number
}

// === Pronunciation Analysis ===

export interface PronunciationResult {
  overall_score: number
  accuracy_score: number
  pronunciation_score: number
  fluency_score: number       // smoothness + pace + hesitations (one unified concept)
  intonation_score: number    // pitch patterns, stress, expression
  completeness_score: number
  pace: 'too-slow' | 'slow' | 'good' | 'fast' | 'too-fast'
  mispronounced: { word: string; expected_sounds: string; student_said: string; tip: string }[]
  skipped: string[]
  fluency_feedback: string    // covers smoothness, pace, hesitations
  intonation_feedback: string // pitch, stress, expression
  reference_comparison: string // comparison to model/standard reading
  pronunciation_tips: string[]
  encouragement: string
}
