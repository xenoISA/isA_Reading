import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'

const TOKEN_COOKIE = 'isa-reading-token'
const TOKEN_EXPIRY_DAYS = 30

export function hashPin(pin: string): string {
  return bcrypt.hashSync(pin, 10)
}

export function verifyPin(pin: string, hash: string): boolean {
  return bcrypt.compareSync(pin, hash)
}

export function generateToken(): string {
  return randomUUID() + '-' + randomUUID()
}

export function getTokenExpiry(): Date {
  const d = new Date()
  d.setDate(d.getDate() + TOKEN_EXPIRY_DAYS)
  return d
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
    path: '/',
  })
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(TOKEN_COOKIE)?.value || null
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(TOKEN_COOKIE)
}

// Avatars for kids — random on signup
const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🦉', '🐙', '🦋', '🐬', '🦄', '🐻', '🐯', '🐰', '🐨', '🦈', '🐢', '🦜']

export function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]
}
