import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { hashPin, generateToken, getTokenExpiry, setAuthCookie, randomAvatar } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, pin, display_name, age, grade, preferred_themes } = await req.json()

    if (!username || !pin) {
      return NextResponse.json({ error: 'Username and PIN are required' }, { status: 400 })
    }

    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: 'Username must be 3-20 characters (letters, numbers, underscore)' }, { status: 400 })
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // Check username uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Username already taken. Try another!' }, { status: 409 })
    }

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        username: username.toLowerCase(),
        pin_hash: hashPin(pin),
        display_name: display_name || username,
        avatar: randomAvatar(),
        age: age || null,
        grade: grade || null,
        preferred_themes: preferred_themes || [],
        reading_level: 1,
      })
      .select()
      .single()

    if (profileError) throw profileError

    // Create auth token
    const token = generateToken()
    const expiresAt = getTokenExpiry()

    const { error: tokenError } = await supabase
      .from('auth_tokens')
      .insert({
        token,
        child_id: profile.id,
        expires_at: expiresAt.toISOString(),
      })

    if (tokenError) throw tokenError

    // Set cookie
    await setAuthCookie(token)

    return NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar: profile.avatar,
        reading_level: profile.reading_level,
        total_points: 0,
        current_streak: 0,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    const message = error instanceof Error ? error.message : 'Signup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
