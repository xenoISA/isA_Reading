'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'

function PinDots({ length }: { length: number }) {
  return (
    <div className="flex gap-3 justify-center" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className={`size-4 rounded-full transition-all duration-150 ${
            i < length
              ? 'bg-accent scale-110'
              : 'bg-border'
          }`}
        />
      ))}
    </div>
  )
}

export default function AuthScreen() {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await login(username, pin)
      } else {
        await signup({ username, pin, display_name: displayName || username })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Mascot area */}
        <div className="text-center space-y-3">
          <div className="text-6xl sm:text-7xl leading-none" aria-hidden="true">
            {mode === 'login' ? '🦊' : '🎉'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-accent text-balance">
            {mode === 'login' ? 'Welcome Back, Reader!' : 'Join the Reading Adventure!'}
          </h1>
          <p className="text-muted text-sm">
            {mode === 'login'
              ? 'Enter your reader name and secret PIN'
              : 'Pick a reader name and a secret 4-digit PIN'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-foreground mb-1.5">
              {mode === 'signup' ? 'Choose your reader name' : 'Your reader name'}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={mode === 'signup' ? 'e.g. star_reader' : 'Your reader name'}
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-border bg-surface text-foreground text-base focus:border-accent focus:outline-none transition-colors placeholder:text-muted/50"
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-semibold text-foreground mb-1.5">
                What should we call you?
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-border bg-surface text-foreground text-base focus:border-accent focus:outline-none transition-colors placeholder:text-muted/50"
              />
            </div>
          )}

          <div>
            <label htmlFor="pin" className="block text-sm font-semibold text-foreground mb-1.5">
              Secret PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4 digits"
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-border bg-surface text-foreground text-center text-2xl tracking-[0.5em] font-mono focus:border-accent focus:outline-none transition-colors placeholder:text-base placeholder:tracking-normal"
              autoComplete="current-password"
              required
            />
            <div className="mt-3">
              <PinDots length={pin.length} />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 rounded-xl p-3 border border-red-200" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || pin.length !== 4}
            className="w-full py-4 bg-accent hover:bg-accent-hover disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl font-bold text-base transition-all active:scale-95"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </span>
            ) : mode === 'login' ? (
              "Let's Read!"
            ) : (
              'Create My Account'
            )}
          </button>
        </form>

        {/* Switch mode */}
        <div className="text-center space-y-3">
          <p className="text-sm text-muted">
            {mode === 'login' ? (
              <>
                First time here?{' '}
                <button onClick={() => { setMode('signup'); setError('') }} className="text-accent font-bold hover:underline">
                  Create account
                </button>
              </>
            ) : (
              <>
                Already a reader?{' '}
                <button onClick={() => { setMode('login'); setError('') }} className="text-accent font-bold hover:underline">
                  Log in
                </button>
              </>
            )}
          </p>
          <a href="/?skip_auth=true" className="text-xs text-muted/60 hover:text-muted underline transition-colors">
            Continue without account
          </a>
        </div>
      </div>
    </div>
  )
}
