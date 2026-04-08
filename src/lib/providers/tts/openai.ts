import OpenAI from 'openai'
import type { TTSProvider, TTSOptions } from '@/types'

export class OpenAITTSProvider implements TTSProvider {
  readonly name = 'openai'
  private client: OpenAI

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY })
  }

  async synthesize(text: string, options?: TTSOptions): Promise<ArrayBuffer> {
    const response = await this.client.audio.speech.create({
      model: options?.model || 'gpt-4o-mini-tts',
      voice: (options?.voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer') || 'nova',
      input: text,
      speed: options?.speed || 0.9, // slightly slower for K12
      response_format: 'mp3',
    })

    return response.arrayBuffer()
  }
}
