'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'

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
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-accent">isA Reading</h1>
          <p className="text-muted mt-1">
            {mode === 'login' ? 'Welcome back!' : 'Create your reader profile'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your reader name"
              className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-white text-foreground text-base focus:border-accent focus:outline-none transition-colors"
              autoComplete="username"
              required
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-1">Display Name (optional)</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-white text-foreground text-base focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          )}

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-foreground mb-1">4-Digit PIN</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="****"
              className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-white text-foreground text-center text-2xl tracking-[0.5em] font-mono focus:border-accent focus:outline-none transition-colors"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl p-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username || pin.length !== 4}
            className="w-full py-4 bg-accent hover:bg-accent-hover disabled:bg-gray-300 text-white rounded-2xl font-bold text-base transition-all active:scale-95"
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        {/* Switch mode */}
        <p className="text-center text-sm text-muted">
          {mode === 'login' ? (
            <>
              New reader?{' '}
              <button onClick={() => { setMode('signup'); setError('') }} className="text-accent font-semibold">
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError('') }} className="text-accent font-semibold">
                Log in
              </button>
            </>
          )}
        </p>

        {/* Skip auth for now */}
        <p className="text-center text-xs text-muted">
          <a href="/?skip_auth=true" className="underline">Continue without account</a>
        </p>
      </div>
    </div>
  )
}
