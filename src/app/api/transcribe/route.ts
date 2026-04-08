import { NextRequest, NextResponse } from 'next/server'
import { createSTTProvider } from '@/lib/providers/stt'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'audio file is required' }, { status: 400 })
    }

    // Vercel free tier: 4.5MB body limit
    if (audioFile.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file too large (max 4MB)' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured. Add it to .env.local' },
        { status: 503 }
      )
    }

    const provider = createSTTProvider('openai')
    const result = await provider.transcribe(audioFile, { language: 'en' })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Transcription error:', error)
    const message = error instanceof Error ? error.message : 'Transcription failed'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
