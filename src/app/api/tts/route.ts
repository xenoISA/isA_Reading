import { NextRequest, NextResponse } from 'next/server'
import { createTTSProvider } from '@/lib/providers/tts'

export async function POST(req: NextRequest) {
  try {
    const { text, voice, speed, model } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    if (text.length > 2000) {
      return NextResponse.json({ error: 'text too long (max 2000 chars)' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured. Add it to .env.local' },
        { status: 503 }
      )
    }

    const provider = createTTSProvider('openai')
    const audioBuffer = await provider.synthesize(text, { voice, speed, model })

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    return NextResponse.json(
      { error: 'TTS generation failed' },
      { status: 500 }
    )
  }
}
