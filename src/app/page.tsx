'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Material, Theme, LLMAssessment, ParagraphProgress, PronunciationResult } from '@/types'
import { BADGE_DEFS, type BadgeKey } from '@/types'
import { useAuth } from '@/components/AuthProvider'
import AuthScreen from '@/components/AuthScreen'
import StepIndicator from '@/components/StepIndicator'
import ThemePicker from '@/components/ThemePicker'
import MaterialSelector from '@/components/MaterialSelector'
import ParagraphReader from '@/components/ParagraphReader'
import DrillMode from '@/components/DrillMode'
import Dashboard from '@/components/Dashboard'
import BottomNav from '@/components/BottomNav'
import WordBank from '@/components/WordBank'

type Step = 'themes' | 'select' | 'read' | 'record' | 'processing' | 'feedback' | 'drill' | 'wordbank' | 'dashboard'
type ParagraphStep = 'reading' | 'recording' | 'processing' | 'feedback'

function speakWithBrowser(text: string) {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.85
  speechSynthesis.speak(utterance)
}

// Map outer step to StepIndicator step
function toIndicatorStep(step: Step): 'select' | 'read' | 'record' | 'processing' | 'feedback' {
  if (step === 'themes' || step === 'dashboard' || step === 'wordbank') return 'select'
  if (step === 'drill') return 'feedback'
  return step
}

const SESSION_STORAGE_KEY = 'isa-reading-session'

interface SavedSession {
  materialId: string
  currentParagraph: number
  paragraphStep: ParagraphStep
  paragraphProgress: ParagraphProgress[]
  savedAt: string
}

function saveSession(materialId: string, currentParagraph: number, paragraphStep: ParagraphStep, paragraphProgress: ParagraphProgress[]) {
  try {
    const session: SavedSession = {
      materialId,
      currentParagraph,
      paragraphStep: paragraphStep === 'recording' || paragraphStep === 'processing' ? 'reading' : paragraphStep,
      paragraphProgress,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch { /* localStorage full or unavailable */ }
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_STORAGE_KEY) } catch {}
}

export default function Home() {
  const { child, loading: authLoading, logout } = useAuth()
  const [skipAuth, setSkipAuth] = useState(false)
  const [step, setStep] = useState<Step>('themes')
  const [newBadgePopup, setNewBadgePopup] = useState<BadgeKey | null>(null)
  const [levelUpPopup, setLevelUpPopup] = useState<number | null>(null)
  const [preferredThemes, setPreferredThemes] = useState<Theme[]>([])
  const [material, setMaterial] = useState<Material | null>(null)
  const [currentParagraph, setCurrentParagraph] = useState(0)
  const [paragraphStep, setParagraphStep] = useState<ParagraphStep>('reading')
  const [paragraphProgress, setParagraphProgress] = useState<ParagraphProgress[]>([])
  const [ttsLoading, setTtsLoading] = useState(false)
  const [ttsPlaying, setTtsPlaying] = useState(false)
  const [studentText, setStudentText] = useState('')
  const [assessment, setAssessment] = useState<LLMAssessment | null>(null)
  const [pronunciation, setPronunciation] = useState<PronunciationResult | null>(null)
  const [drillWords, setDrillWords] = useState<{ word: string; tip: string }[]>([])
  const [drillOrigin, setDrillOrigin] = useState<'feedback' | 'wordbank'>('feedback')
  const [error, setError] = useState<string | null>(null)
  const [processingStage, setProcessingStage] = useState<'transcribing' | 'analyzing' | 'scoring'>('transcribing')
  const [savedMaterialId, setSavedMaterialId] = useState<string | null>(null)

  const handleThemesComplete = useCallback((themes: Theme[]) => {
    setPreferredThemes(themes)
    setStep('select')
  }, [])

  // Auto-save session on meaningful state changes
  useEffect(() => {
    if (material && (step === 'read' || step === 'record' || step === 'processing' || step === 'feedback' || step === 'drill')) {
      saveSession(material.id, currentParagraph, paragraphStep, paragraphProgress)
    }
  }, [material, currentParagraph, paragraphStep, paragraphProgress, step])

  // Load saved material ID (re-check when returning to select)
  useEffect(() => {
    const saved = loadSession()
    setSavedMaterialId(saved?.materialId ?? null)
  }, [step])

  const handleSelectMaterial = useCallback((m: Material) => {
    const saved = loadSession()
    if (saved && saved.materialId === m.id) {
      // Resume saved session
      setMaterial(m)
      setCurrentParagraph(saved.currentParagraph)
      setParagraphStep(saved.paragraphStep)
      setAssessment(null)
      setPronunciation(null)
      setStudentText('')
      setError(null)
      setParagraphProgress(saved.paragraphProgress)
      setStep(saved.paragraphStep === 'feedback' ? 'feedback' : 'read')
      return
    }
    // Fresh start
    setMaterial(m)
    setCurrentParagraph(0)
    setParagraphStep('reading')
    setAssessment(null)
    setPronunciation(null)
    setStudentText('')
    setError(null)
    const progress: ParagraphProgress[] = (m.paragraphs || []).map((_, i) => ({
      paragraph_index: i,
      status: 'pending' as const,
    }))
    setParagraphProgress(progress)
    setStep('read')
    clearSession()
    setSavedMaterialId(null)
  }, [])

  const handlePlayParagraph = useCallback(async () => {
    if (!material?.paragraphs?.[currentParagraph]) return
    setTtsLoading(true)
    setError(null)

    const text = material.paragraphs[currentParagraph].text
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (res.status === 503) {
        speakWithBrowser(text)
        return
      }
      if (!res.ok) throw new Error('TTS failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      setTtsPlaying(true)
      audio.onended = () => setTtsPlaying(false)
      audio.play()
    } catch {
      speakWithBrowser(text)
    } finally {
      setTtsLoading(false)
    }
  }, [material, currentParagraph])

  const handleStartRecording = useCallback(() => {
    setParagraphStep('recording')
    setStep('record')
  }, [])

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    if (!material?.paragraphs?.[currentParagraph]) return
    setParagraphStep('processing')
    setStep('processing')
    setProcessingStage('transcribing')
    setError(null)

    const paragraph = material.paragraphs[currentParagraph]

    try {
      // Build forms
      const transcribeForm = new FormData()
      transcribeForm.append('audio', blob, 'recording.webm')

      // Convert to wav for pronunciation API (client-side, no ffmpeg needed)
      let wavBlob: Blob | null = null
      try {
        const { convertBlobToWav } = await import('@/lib/audio-utils')
        wavBlob = await convertBlobToWav(blob)
      } catch { /* wav conversion failed */ }

      const pronounceForm = new FormData()
      if (wavBlob) {
        pronounceForm.append('audio', wavBlob, 'recording.wav')
      } else {
        pronounceForm.append('audio', blob, 'recording.webm')
      }
      pronounceForm.append('target_text', paragraph.text)
      pronounceForm.append('keywords', JSON.stringify(paragraph.keywords))

      // Start transcribe + pronounce in parallel
      const transcribePromise = fetch('/api/transcribe', { method: 'POST', body: transcribeForm })
      const pronouncePromise = fetch('/api/pronounce', { method: 'POST', body: pronounceForm }).catch(() => null)

      // Wait for transcribe (needed for assess)
      const transcribeRes = await transcribePromise
      if (!transcribeRes.ok) {
        const err = await transcribeRes.json()
        throw new Error(err.error || 'Transcription failed')
      }
      const transcript = await transcribeRes.json()
      setStudentText(transcript.text)
      setProcessingStage('analyzing')

      // Start assess immediately (don't wait for pronounce!)
      const assessPromise = fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_text: paragraph.text,
          student_text: transcript.text,
          difficulty: material.difficulty,
          domain: material.theme,
          paragraph_index: currentParagraph,
          total_paragraphs: material.paragraphs.length,
          keywords: paragraph.keywords,
        }),
      })

      setProcessingStage('scoring')

      // Wait for both assess and pronounce in parallel
      const [assessRes, pronounceRes] = await Promise.all([
        assessPromise,
        pronouncePromise,
      ])

      // Process pronunciation (non-blocking)
      let pronResult: PronunciationResult | null = null
      if (pronounceRes?.ok) {
        pronResult = await pronounceRes.json()
        setPronunciation(pronResult)
      }

      // Process assessment
      if (!assessRes.ok) {
        const err = await assessRes.json()
        throw new Error(err.error || 'Assessment failed')
      }
      const result = await assessRes.json()
      setAssessment(result)

      // Level-up celebration
      if (result.reading_level && child && result.reading_level > child.reading_level) {
        setLevelUpPopup(result.reading_level)
        setTimeout(() => setLevelUpPopup(null), 6000)
      }

      // Show new badge popup if earned
      if (result.new_badges?.length > 0) {
        setNewBadgePopup(result.new_badges[0] as BadgeKey)
        setTimeout(() => setNewBadgePopup(null), 4000)
      }

      // Update paragraph progress
      setParagraphProgress(prev => {
        const updated = [...prev]
        updated[currentParagraph] = {
          paragraph_index: currentParagraph,
          status: 'completed',
          accuracy_score: result.accuracy_score,
          transcript: transcript.text,
          assessment: result,
        }
        return updated
      })

      // Auto-add mispronounced words to spaced rep queue
      try {
        const { addWordsToQueue } = await import('@/lib/growth/spaced-rep')
        const wordsToQueue: { word: string; tip: string; contextSentence?: string; sourceMaterial?: string; sourceTheme?: string }[] = []
        if (pronResult?.mispronounced) {
          for (const m of pronResult.mispronounced) {
            if (m.word.length > 1) wordsToQueue.push({
              word: m.word,
              tip: m.tip,
              contextSentence: paragraph.text.slice(0, 200),
              sourceMaterial: material.title,
              sourceTheme: material.theme,
            })
          }
        }
        if (wordsToQueue.length > 0) addWordsToQueue(wordsToQueue)
      } catch { /* non-critical */ }

      setParagraphStep('feedback')
      setStep('feedback')
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setParagraphStep('recording')
      setStep('record')
    }
  }, [material, currentParagraph])

  const handleRetryParagraph = useCallback(() => {
    setAssessment(null)
    setPronunciation(null)
    setStudentText('')
    setParagraphStep('recording')
    setStep('record')
  }, [])

  const handleStartDrill = useCallback(() => {
    const words: { word: string; tip: string }[] = []

    if (pronunciation?.mispronounced) {
      for (const m of pronunciation.mispronounced) {
        if (m.word.length > 1) {
          words.push({ word: m.word, tip: m.tip })
        }
      }
    } else if (assessment?.mispronounced_words) {
      for (const m of assessment.mispronounced_words) {
        words.push({ word: m.expected, tip: `You said "${m.actual}"` })
      }
    }

    if (words.length > 0) {
      setDrillWords(words)
      setDrillOrigin('feedback')
      setStep('drill')
    }
  }, [pronunciation, assessment])

  const handleDrillComplete = useCallback(async (results: { word: string; attempts: number; bestScore: number; passed: boolean }[]) => {
    // Add failed words to spaced rep queue
    try {
      const { addWordsToQueue } = await import('@/lib/growth/spaced-rep')
      const failedWords = results
        .filter(r => !r.passed)
        .map(r => ({ word: r.word, tip: `Score: ${r.bestScore}%` }))
      if (failedWords.length > 0) {
        addWordsToQueue(failedWords)
      }
    } catch { /* spaced rep not critical */ }

    // Track drill completion count
    try {
      const drillCountKey = 'isa-reading-drills-completed'
      const count = parseInt(localStorage.getItem(drillCountKey) || '0', 10)
      localStorage.setItem(drillCountKey, String(count + 1))
    } catch {}

    // Advance/demote words in spaced rep
    try {
      const { advanceWord } = await import('@/lib/growth/spaced-rep')
      for (const r of results) {
        advanceWord(r.word, r.passed)
      }
    } catch { /* non-critical */ }

    setStep(drillOrigin === 'wordbank' ? 'wordbank' : 'feedback')
    setDrillWords([])
  }, [drillOrigin])

  const handleDrillSkip = useCallback(() => {
    setStep(drillOrigin === 'wordbank' ? 'wordbank' : 'feedback')
    setDrillWords([])
  }, [drillOrigin])

  const handleWordBankDrill = useCallback((words: { word: string; tip: string }[]) => {
    setDrillWords(words)
    setDrillOrigin('wordbank')
    setStep('drill')
  }, [])

  const handleQuickReview = useCallback(() => {
    import('@/lib/growth/spaced-rep').then(({ getDueWords }) => {
      const due = getDueWords().slice(0, 5)
      if (due.length > 0) {
        setDrillWords(due.map(d => ({ word: d.word, tip: d.tip })))
        setDrillOrigin('wordbank')
        setStep('drill')
      }
    }).catch(() => {})
  }, [])

  const handleErrorPatternDrill = useCallback((words: { word: string; tip: string }[]) => {
    if (words.length > 0) {
      setDrillWords(words)
      setDrillOrigin('wordbank')
      setStep('drill')
    }
  }, [])

  const handleNextParagraph = useCallback(() => {
    setCurrentParagraph(prev => prev + 1)
    setAssessment(null)
    setPronunciation(null)
    setStudentText('')
    setParagraphStep('reading')
    setStep('read')
  }, [])

  const handlePrevParagraph = useCallback(() => {
    setCurrentParagraph(prev => Math.max(0, prev - 1))
    setParagraphStep('reading')
    setStep('read')
  }, [])

  const handleNewMaterial = useCallback(() => {
    clearSession()
    setSavedMaterialId(null)
    setStep('select')
    setMaterial(null)
    setAssessment(null)
    setPronunciation(null)
    setStudentText('')
    setCurrentParagraph(0)
    setParagraphProgress([])
    setError(null)
  }, [])

  const handleChangeThemes = useCallback(() => {
    localStorage.removeItem('isa-reading-themes')
    setStep('themes')
  }, [])

  // Calculate overall progress
  const completedParagraphs = paragraphProgress.filter(p => p.status === 'completed').length
  const totalParagraphs = material?.paragraphs?.length || 0
  const averageScore = completedParagraphs > 0
    ? Math.round(paragraphProgress.reduce((sum, p) => sum + (p.accuracy_score || 0), 0) / completedParagraphs)
    : 0

  // Auth gate: show login if Supabase configured and not logged in
  if (authLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="size-10 border-4 border-border border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  const useSupabase = typeof window !== 'undefined' && !skipAuth
  const needsAuth = useSupabase && !child && typeof window !== 'undefined' &&
    !new URLSearchParams(window.location.search).has('skip_auth')

  if (needsAuth) {
    return <AuthScreen />
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Badge popup */}
      {newBadgePopup && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-6 py-4 shadow-lg text-center">
            <p className="text-3xl">{BADGE_DEFS[newBadgePopup]?.icon}</p>
            <p className="font-bold text-amber-800 mt-1">New Badge!</p>
            <p className="text-sm text-amber-600">{BADGE_DEFS[newBadgePopup]?.name}</p>
          </div>
        </div>
      )}

      {/* Level-up celebration */}
      {levelUpPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-scale-in">
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-sm mx-4 space-y-4">
            <p className="text-6xl">🎉</p>
            <h2 className="text-2xl font-bold text-foreground">Level Up!</h2>
            <p className="text-4xl font-black text-accent">Level {levelUpPopup}</p>
            <p className="text-muted text-sm">Amazing work! Keep reading to reach the next level.</p>
            <button
              onClick={() => setLevelUpPopup(null)}
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold transition-all active:scale-95"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Header — simplified, bottom nav handles main navigation */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleNewMaterial}
            className="text-lg sm:text-xl font-bold text-accent hover:text-accent-hover transition-colors"
          >
            isA Reading
          </button>
          <div className="flex items-center gap-3">
            {step !== 'themes' && step !== 'select' && step !== 'dashboard' && step !== 'wordbank' && (
              <button
                onClick={handleNewMaterial}
                className="text-sm text-muted hover:text-foreground transition-colors font-medium"
              >
                Change
              </button>
            )}
            {step === 'select' && (
              <button
                onClick={handleChangeThemes}
                className="text-sm text-muted hover:text-foreground transition-colors font-medium"
              >
                Topics
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Step indicator — only for reading flow steps */}
      {step !== 'themes' && step !== 'dashboard' && step !== 'drill' && step !== 'wordbank' && (
        <StepIndicator currentStep={toIndicatorStep(step)} />
      )}

      {/* Main content */}
      <main className={`flex-1 max-w-2xl mx-auto w-full px-4 ${child ? 'pb-24' : 'pb-8'}`}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error" className="text-red-400 hover:text-red-600 font-bold text-lg leading-none">&times;</button>
          </div>
        )}

        {/* === Dashboard === */}
        {step === 'dashboard' && (
          <Dashboard onStartReading={() => setStep('select')} onQuickReview={handleQuickReview} onErrorPatternDrill={handleErrorPatternDrill} />
        )}

        {/* === Word Bank === */}
        {step === 'wordbank' && (
          <WordBank onStartReview={handleWordBankDrill} />
        )}

        {/* === Theme Picker === */}
        {step === 'themes' && (
          <ThemePicker onComplete={handleThemesComplete} />
        )}

        {/* === Select Material === */}
        {step === 'select' && (
          <div className="animate-scale-in">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 text-balance">
              Choose a reading
            </h2>
            <p className="text-muted mb-5">Pick a story that looks fun</p>
            <MaterialSelector
              onSelect={handleSelectMaterial}
              selected={material}
              preferredThemes={preferredThemes}
              savedMaterialId={savedMaterialId}
              readingLevel={child?.reading_level}
              avgAccuracy={0}
            />
          </div>
        )}

        {/* === Reading Flow (paragraph by paragraph) === */}
        {(step === 'read' || step === 'record' || step === 'processing' || step === 'feedback' || step === 'drill') && material && (
          <div className="space-y-4">
            {/* Material title + progress */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">{material.title}</h2>
              {completedParagraphs > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-600">
                  {completedParagraphs}/{totalParagraphs} done
                  {averageScore > 0 && ` · ${averageScore}%`}
                </span>
              )}
            </div>

            <ParagraphReader
              paragraphs={material.paragraphs || [{ index: 0, text: material.content, keywords: [] }]}
              currentIndex={currentParagraph}
              progress={paragraphProgress}
              step={paragraphStep}
              processingStage={processingStage}
              assessment={assessment}
              pronunciation={pronunciation}
              studentText={studentText}
              ttsLoading={ttsLoading}
              ttsPlaying={ttsPlaying}
              onPlayParagraph={handlePlayParagraph}
              onStartRecording={handleStartRecording}
              onRecordingComplete={handleRecordingComplete}
              onRetryParagraph={handleRetryParagraph}
              onNextParagraph={handleNextParagraph}
              onPrevParagraph={handlePrevParagraph}
              onStartDrill={handleStartDrill}
            />

            {/* Drill mode */}
            {step === 'drill' && drillWords.length > 0 && (
              <DrillMode
                words={drillWords}
                onComplete={handleDrillComplete}
                onSkip={handleDrillSkip}
              />
            )}

            {/* Overall summary when all paragraphs done */}
            {completedParagraphs === totalParagraphs && totalParagraphs > 0 && step === 'feedback' && currentParagraph === totalParagraphs - 1 && (
              <div className="mt-6 p-5 bg-green-50 border-2 border-green-200 rounded-2xl text-center space-y-3 animate-bounce-in">
                <p className="text-3xl">🎉</p>
                <p className="text-lg font-bold text-green-700">All paragraphs complete!</p>
                <p className="text-sm text-green-600">Average score: {averageScore}%</p>
                <button
                  onClick={handleNewMaterial}
                  className="mt-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold transition-all active:scale-95"
                >
                  Read Something New
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom navigation — only when logged in */}
      {child && (
        <BottomNav
          activeTab={step === 'dashboard' ? 'dashboard' : step === 'wordbank' ? 'wordbank' : 'read'}
          onTabChange={(tab) => {
            if (tab === 'dashboard') setStep('dashboard')
            else if (tab === 'wordbank') setStep('wordbank')
            else if (step === 'dashboard' || step === 'wordbank') setStep('select')
          }}
          streak={child.current_streak}
          points={child.total_points}
          avatar={child.avatar}
        />
      )}
    </div>
  )
}
