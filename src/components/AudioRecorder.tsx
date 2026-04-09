'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  onRecordingComplete: (blob: Blob) => void
  disabled?: boolean
  onPause?: () => void
  onStartOver?: () => void
}

type RecorderState = 'idle' | 'countdown' | 'recording' | 'done'

export default function AudioRecorder({ onRecordingComplete, disabled, onPause, onStartOver }: Props) {
  const [state, setState] = useState<RecorderState>('idle')
  const [countdown, setCountdown] = useState(3)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown effect
  useEffect(() => {
    if (state !== 'countdown') return

    if (countdown <= 0) {
      // Start actual recording
      startActualRecording()
      return
    }

    const timer = setTimeout(() => setCountdown(c => c - 1), 700)
    return () => clearTimeout(timer)
  }, [state, countdown])

  const startActualRecording = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    })

    chunksRef.current = []
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setState('done')
      onRecordingComplete(blob)
      stream.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    mediaRecorder.start(100)
    setState('recording')
    setDuration(0)

    timerRef.current = setInterval(() => {
      setDuration(d => d + 1)
    }, 1000)
  }, [onRecordingComplete])

  const handleStart = useCallback(async () => {
    try {
      // Get mic access first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Start countdown
      setCountdown(3)
      setAudioUrl(null)
      setState('countdown')
    } catch {
      alert('Please allow microphone access to record your reading.')
    }
  }, [])

  const handleStop = useCallback(() => {
    mediaRecorderRef.current?.stop()
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* === Countdown === */}
      {state === 'countdown' && (
        <div className="flex flex-col items-center gap-4 animate-scale-in">
          <div className="size-28 sm:size-32 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-5xl sm:text-6xl font-bold text-amber-600 animate-bounce-in" key={countdown}>
              {countdown > 0 ? countdown : ''}
            </span>
          </div>
          <p className="text-lg font-bold text-amber-600">Get ready to read!</p>
          <p className="text-sm text-muted">Recording starts soon...</p>
        </div>
      )}

      {/* === Idle / Done — show record button === */}
      {(state === 'idle' || state === 'done') && (
        <>
          <div className="relative">
            <button
              onClick={handleStart}
              disabled={disabled}
              aria-label="Start recording"
              className={`relative size-24 sm:size-28 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                disabled
                  ? 'bg-gray-200 cursor-not-allowed'
                  : state === 'done'
                    ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200'
                    : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-200'
              } text-white`}
            >
              {state === 'done' ? (
                <svg className="size-10 sm:size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="size-10 sm:size-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              )}
            </button>
          </div>

          <div className="text-center space-y-1">
            {state === 'done' ? (
              <p className="text-green-600 font-semibold">Done! Tap to re-record</p>
            ) : (
              <>
                <p className="text-lg font-semibold text-foreground">Tap to start</p>
                <p className="text-sm text-muted">A countdown will give you time to get ready</p>
              </>
            )}
          </div>
        </>
      )}

      {/* === Recording === */}
      {state === 'recording' && (
        <>
          <div className="relative">
            <div className="absolute inset-0 rounded-full animate-pulse-ring" />
            <button
              onClick={handleStop}
              aria-label="Stop recording"
              className="relative size-24 sm:size-28 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 text-white transition-all active:scale-95"
            >
              <svg className="size-10 sm:size-12" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          </div>

          <div className="text-center space-y-1">
            <p className="text-red-500 font-mono text-2xl font-bold tabular-nums">
              {formatTime(duration)}
            </p>
            <p className="text-sm text-muted">Reading... tap to stop when done</p>
          </div>

          {/* Session controls — visible during recording */}
          {(onPause || onStartOver) && (
            <div className="flex gap-3 w-full max-w-xs">
              {onPause && (
                <button
                  onClick={onPause}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-border bg-surface hover:bg-surface-alt text-foreground rounded-2xl font-semibold text-sm transition-all active:scale-95"
                >
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                  Pause
                </button>
              )}
              {onStartOver && (
                <button
                  onClick={onStartOver}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-border bg-surface hover:bg-surface-alt text-foreground rounded-2xl font-semibold text-sm transition-all active:scale-95"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Start Over
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Playback */}
      {audioUrl && state === 'done' && (
        <audio controls src={audioUrl} className="w-full max-w-xs rounded-lg" />
      )}
    </div>
  )
}
