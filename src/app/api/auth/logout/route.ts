import { NextResponse } from 'next/server'
import { getAuthToken, clearAuthCookie } from '@/lib/auth'
import { getSupabaseClient } from '@/lib/supabase'

export async function POST() {
  try {
    const token = await getAuthToken()

    if (token) {
      const supabase = getSupabaseClient()
      await supabase.from('auth_tokens').delete().eq('token', token)
    }

    await clearAuthCookie()

    return NextResponse.json({ success: true })
  } catch {
    await clearAuthCookie()
    return NextResponse.json({ success: true })
  }
}
