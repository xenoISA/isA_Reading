import { NextRequest, NextResponse } from 'next/server'
import { OpenAIPronunciationAnalyzer } from '@/lib/providers/pronunciation/openai'
import { createTTSProvider } from '@/lib/providers/tts'

// Generate reference TTS audio as mp3 buffer
async function generateReferenceAudio(text: string): Promise<Buffer> {
  const provider = createTTSProvider('openai')
  const mp3ArrayBuffer = await provider.synthesize(text, { speed: 0.9 })
  return Buffer.from(mp3ArrayBuffer)
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null
    const targetText = formData.get('target_text') as string | null
    const keywordsStr = formData.get('keywords') as string | null

    if (!audioFile || !targetText) {
      return NextResponse.json(
        { error: 'audio file and target_text are required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
    }

    const keywords = keywordsStr ? JSON.parse(keywordsStr) : []
    const studentAudio = Buffer.from(await audioFile.arrayBuffer())

    // Generate reference TTS (mp3 → GPT-4o accepts mp3 too)
    let referenceAudio: Buffer | undefined
    try {
      referenceAudio = await generateReferenceAudio(targetText)
    } catch (err) {
      console.warn('Reference audio generation failed:', err)
    }

    const analyzer = new OpenAIPronunciationAnalyzer()
    const analysis = await analyzer.analyze(studentAudio, targetText, keywords, referenceAudio)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Pronunciation analysis error:', error)
    const message = error instanceof Error ? error.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
