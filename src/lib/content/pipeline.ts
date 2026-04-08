import type { Theme, Material } from '@/types'
import { searchContent, extractCleanText } from './tavily-search'
import { createMaterialFromText, generateMaterialId } from './paragraph-generator'
import { validateMaterial, type QualityReport } from './validators'

export interface PipelineResult {
  material: Omit<Material, 'created_at'>
  quality: QualityReport
  source?: string
}

// Full pipeline: Tavily search → extract → generate → validate
export async function generateFromSearch(
  theme: Theme,
  difficulty: number,
  query?: string
): Promise<PipelineResult> {
  // 1. Search for source content
  const results = await searchContent({ theme, difficulty, query, limit: 3 })

  if (results.length === 0) {
    throw new Error('No search results found. Try a different query or theme.')
  }

  // Pick the best result (highest score, longest content)
  const best = results.sort((a, b) => {
    const contentLenA = (a.raw_content || a.content || '').length
    const contentLenB = (b.raw_content || b.content || '').length
    return (b.score * contentLenB) - (a.score * contentLenA)
  })[0]

  const rawText = extractCleanText(best, 1000)

  if (rawText.length < 100) {
    throw new Error('Source content too short. Try a different search.')
  }

  // 2. Generate structured material via LLM
  const material = await createMaterialFromText(rawText, theme, difficulty)

  // 3. Validate quality
  const quality = validateMaterial(material.content, material.paragraphs, difficulty)

  return {
    material: { ...material, source: best.url },
    quality,
    source: best.url,
  }
}

// Generate from provided text (no Tavily)
export async function generateFromText(
  rawText: string,
  theme: Theme,
  difficulty: number,
  title?: string
): Promise<PipelineResult> {
  if (rawText.length < 50) {
    throw new Error('Text too short. Provide at least 50 characters of source material.')
  }

  const material = await createMaterialFromText(rawText, theme, difficulty, title)
  const quality = validateMaterial(material.content, material.paragraphs, difficulty)

  return { material, quality }
}

// Store material to JSON file (local dev) or Supabase
export async function storeMaterial(material: Omit<Material, 'created_at'>): Promise<Material> {
  const fullMaterial: Material = {
    ...material,
    created_at: new Date().toISOString(),
  }

  const useSupabase = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  if (useSupabase) {
    const { getSupabaseClient } = await import('@/lib/supabase')
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('materials').insert(fullMaterial)
    if (error) throw new Error(`Supabase insert error: ${error.message}`)
  } else {
    // Append to local JSON
    const fs = await import('fs/promises')
    const path = await import('path')
    const filePath = path.join(process.cwd(), 'content', 'materials.json')
    const raw = await fs.readFile(filePath, 'utf-8')
    const materials = JSON.parse(raw) as Material[]
    materials.push(fullMaterial)
    await fs.writeFile(filePath, JSON.stringify(materials, null, 2))
  }

  return fullMaterial
}
