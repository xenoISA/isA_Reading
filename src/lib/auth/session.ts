import { getSupabaseClient } from '@/lib/supabase'
import { getAuthToken } from './index'
import type { ChildProfile } from '@/types'

export async function getCurrentChild(): Promise<ChildProfile | null> {
  const token = await getAuthToken()
  if (!token) return null

  const supabase = getSupabaseClient()

  // Look up token → child
  const { data: tokenData } = await supabase
    .from('auth_tokens')
    .select('child_id, expires_at')
    .eq('token', token)
    .single()

  if (!tokenData) return null

  // Check expiry
  if (new Date(tokenData.expires_at) < new Date()) return null

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', tokenData.child_id)
    .single()

  return profile as ChildProfile | null
}
