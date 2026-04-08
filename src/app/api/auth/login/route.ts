import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { verifyPin, generateToken, getTokenExpiry, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, pin } = await req.json()

    if (!username || !pin) {
      return NextResponse.json({ error: 'Username and PIN are required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.toLowerCase())
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Username not found' }, { status: 401 })
    }

    if (!verifyPin(pin, profile.pin_hash)) {
      return NextResponse.json({ error: 'Wrong PIN. Try again!' }, { status: 401 })
    }

    // Create new auth token
    const token = generateToken()
    const expiresAt = getTokenExpiry()

    await supabase.from('auth_tokens').insert({
      token,
      child_id: profile.id,
      expires_at: expiresAt.toISOString(),
    })

    await setAuthCookie(token)

    return NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar: profile.avatar,
        reading_level: profile.reading_level,
        total_points: profile.total_points,
        current_streak: profile.current_streak,
        preferred_themes: profile.preferred_themes,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
