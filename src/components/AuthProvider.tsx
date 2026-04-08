'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { ChildProfile } from '@/types'

interface AuthContextType {
  child: ChildProfile | null
  loading: boolean
  login: (username: string, pin: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

interface SignupData {
  username: string
  pin: string
  display_name?: string
  age?: number
  grade?: string
  preferred_themes?: string[]
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [child, setChild] = useState<ChildProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setChild(data.profile || null)
    } catch {
      setChild(null)
    }
  }, [])

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false))
  }, [refreshProfile])

  const login = useCallback(async (username: string, pin: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    setChild(data.profile)
  }, [])

  const signup = useCallback(async (data: SignupData) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error)
    setChild(result.profile)
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setChild(null)
  }, [])

  return (
    <AuthContext.Provider value={{ child, loading, login, signup, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
