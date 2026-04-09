'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  onRecordingComplete: (blob: Blob) => void
  disabled?: boolean
}

type RecorderState = 'idle' | 'countdown' | 'recording' | 'paused' | 'done'

export default function AudioRecorder({ onRecordingComplete, disabled }: Props) {
  const [state, setState] = useState<RecorderState>('idle')
  const [countdown, setCountdown] = useState(3)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelledRef = useRef(false)

  // Countdown effect
  useEffect(() => {
    if (state !== 'countdown') return

    if (countdown <= 0) {
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
    cancelledRef.current = false
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      streamRef.current = null
      if (cancelledRef.current) return
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setState('done')
      onRecordingComplete(blob)
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
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

  const handlePause = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setState('paused')
    }
  }, [])

  const handleResume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
      setState('recording')
    }
  }, [])

  const handleRestart = useCallback(() => {
    // Discard current recording, start fresh
    cancelledRef.current = true
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const recorder = mediaRecorderRef.current
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
      recorder.stop()
    } else {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
    setDuration(0)
    setAudioUrl(null)
    setState('idle')
  }, [])

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const isActive = state === 'recording' || state === 'paused'

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

      {/* === Recording / Paused — three circle controls === */}
      {isActive && (
        <>
          <div className="flex items-center justify-center gap-6">
            {/* Pause / Resume — left circle */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={state === 'paused' ? handleResume : handlePause}
                aria-label={state === 'paused' ? 'Resume recording' : 'Pause recording'}
                className={`size-14 sm:size-16 rounded-full flex items-center justify-center shadow-sm transition-all active:scale-95 ${
                  state === 'paused'
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-200'
                    : 'border-2 border-border bg-surface hover:bg-surface-alt text-muted hover:text-foreground'
                }`}
              >
                {state === 'paused' ? (
                  <svg className="size-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                )}
              </button>
              <span className="text-[10px] font-semibold text-muted">
                {state === 'paused' ? 'Resume' : 'Pause'}
              </span>
            </div>

            {/* Stop — center circle (main) */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {state === 'recording' && (
                  <div className="absolute inset-0 rounded-full animate-pulse-ring" />
                )}
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
              <p className={`font-mono text-xl font-bold tabular-nums ${state === 'paused' ? 'text-amber-500' : 'text-red-500'}`}>
                {formatTime(duration)}
              </p>
            </div>

            {/* Restart — right circle */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleRestart}
                aria-label="Restart recording"
                className="size-14 sm:size-16 rounded-full flex items-center justify-center border-2 border-border bg-surface hover:bg-surface-alt text-muted hover:text-foreground shadow-sm transition-all active:scale-95"
              >
                <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <span className="text-[10px] font-semibold text-muted">Restart</span>
            </div>
          </div>

          <p className="text-sm text-muted text-center">
            {state === 'paused' ? 'Paused — tap resume to continue' : 'Reading... tap stop when done'}
          </p>
        </>
      )}

      {/* Playback */}
      {audioUrl && state === 'done' && (
        <audio controls src={audioUrl} className="w-full max-w-xs rounded-lg" />
      )}
    </div>
  )
}
