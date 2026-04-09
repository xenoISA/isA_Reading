'use client'

import { useState } from 'react'

interface Props {
  initialName?: string
  onComplete: (data: { displayName: string; avatar: string; grade: string }) => void
}

const AVATARS = ['\uD83E\uDD8A', '\uD83D\uDC31', '\uD83E\uDD81', '\uD83D\uDC38', '\uD83E\uDD8B', '\uD83D\uDC2C', '\uD83E\uDD84', '\uD83D\uDC3C', '\uD83D\uDC35', '\uD83E\uDD89']
const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8']

export default function ProfileSetup({ initialName, onComplete }: Props) {
  const [displayName, setDisplayName] = useState(initialName || '')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [grade, setGrade] = useState<string | null>(null)

  const canContinue = avatar !== null && grade !== null

  const handleSubmit = () => {
    if (!canContinue) return
    onComplete({
      displayName: displayName.trim() || 'Reader',
      avatar,
      grade,
    })
  }

  return (
    <div className="animate-scale-in space-y-6 py-6">
      <div className="text-center">
        <p className="text-4xl mb-2">{'\uD83D\uDCDA'}</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-balance">
          Let&apos;s set up your reading space!
        </h2>
        <p className="text-muted mt-2">Tell us a bit about yourself</p>
      </div>

      {/* Display name */}
      <div className="space-y-2">
        <label htmlFor="display-name" className="text-sm font-semibold text-foreground">
          Your name
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="What should we call you?"
          className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-white text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      {/* Avatar picker */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Pick your avatar</p>
        <div className="grid grid-cols-5 gap-3">
          {AVATARS.map(emoji => {
            const isSelected = avatar === emoji
            return (
              <button
                key={emoji}
                onClick={() => setAvatar(emoji)}
                className={`aspect-square rounded-2xl border-2 transition-all active:scale-95 flex items-center justify-center text-3xl ${
                  isSelected
                    ? 'border-accent ring-2 ring-accent/30 bg-orange-50 shadow-sm'
                    : 'border-border bg-white hover:border-border-active'
                }`}
              >
                {emoji}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grade level */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Grade level</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {GRADES.map(g => {
            const isSelected = grade === g
            return (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`flex-shrink-0 w-11 h-11 rounded-2xl border-2 transition-all active:scale-95 font-bold text-sm ${
                  isSelected
                    ? 'border-accent bg-accent text-white shadow-sm'
                    : 'border-border bg-white text-foreground hover:border-border-active'
                }`}
              >
                {g}
              </button>
            )
          })}
        </div>
      </div>

      {/* Next button */}
      <button
        onClick={handleSubmit}
        disabled={!canContinue}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95 shadow-md ${
          canContinue
            ? 'bg-accent hover:bg-accent-hover text-white'
            : 'bg-border text-muted cursor-not-allowed'
        }`}
      >
        Next
      </button>
    </div>
  )
}
