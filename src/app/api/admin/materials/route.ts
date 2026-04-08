import { NextRequest, NextResponse } from 'next/server'
import { storeMaterial } from '@/lib/content/pipeline'
import { validateMaterial } from '@/lib/content/validators'
import type { Material } from '@/types'

// POST: Save a material directly (manual creation or after reviewing generate output)
export async function POST(req: NextRequest) {
  try {
    const material = await req.json() as Omit<Material, 'created_at'>

    if (!material.title || !material.paragraphs || !material.difficulty || !material.theme) {
      return NextResponse.json(
        { error: 'title, paragraphs, difficulty, and theme are required' },
        { status: 400 }
      )
    }

    // Validate before saving
    const quality = validateMaterial(material.content, material.paragraphs, material.difficulty)

    if (!quality.safety.passed) {
      return NextResponse.json(
        { error: 'Content failed safety check', issues: quality.safety.issues },
        { status: 400 }
      )
    }

    const saved = await storeMaterial(material)

    return NextResponse.json({
      material: saved,
      quality_report: quality,
    })
  } catch (error) {
    console.error('Save material error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save material' },
      { status: 500 }
    )
  }
}
