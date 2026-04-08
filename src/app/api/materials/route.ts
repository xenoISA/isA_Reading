import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

async function getMaterialsFromFile(difficulty?: number, theme?: string) {
  const filePath = path.join(process.cwd(), 'content', 'materials.json')
  const raw = await readFile(filePath, 'utf-8')
  let materials = JSON.parse(raw) as Array<Record<string, unknown>>

  if (difficulty) {
    materials = materials.filter(m => m.difficulty === difficulty)
  }

  if (theme) {
    materials = materials.filter(m => m.theme === theme)
  }

  return materials
}

async function getMaterialsFromSupabase(difficulty?: number, theme?: string) {
  const { getSupabaseClient } = await import('@/lib/supabase')
  const supabase = getSupabaseClient()

  let query = supabase
    .from('materials')
    .select('*')
    .order('difficulty', { ascending: true })

  if (difficulty) query = query.eq('difficulty', difficulty)
  if (theme) query = query.eq('theme', theme)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const difficultyParam = searchParams.get('difficulty')
    const themeParam = searchParams.get('theme')
    const difficulty = difficultyParam ? parseInt(difficultyParam) : undefined
    const theme = themeParam || undefined

    const useSupabase = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const data = useSupabase
      ? await getMaterialsFromSupabase(difficulty, theme)
      : await getMaterialsFromFile(difficulty, theme)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Materials fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    )
  }
}
