import OpenAI, { toFile } from 'openai'
import type { STTProvider, STTOptions, TranscriptResult } from '@/types'

export class OpenAISTTProvider implements STTProvider {
  readonly name = 'openai'
  private client: OpenAI

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY })
  }

  async transcribe(audio: Blob | File, options?: STTOptions): Promise<TranscriptResult> {
    const model = options?.model || 'whisper-1'

    // Convert browser File/Blob to OpenAI-compatible file
    const buffer = Buffer.from(await audio.arrayBuffer())
    const filename = audio instanceof File ? audio.name : 'recording.webm'
    const file = await toFile(buffer, filename, { type: audio.type || 'audio/webm' })

    if (model === 'whisper-1') {
      // whisper-1 supports verbose_json with word timestamps
      const response = await this.client.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        language: options?.language || 'en',
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      })

      return {
        text: response.text,
        words: response.words?.map(w => ({
          word: w.word,
          start: w.start,
          end: w.end,
        })),
        language: response.language || 'en',
        duration: response.duration || 0,
      }
    }

    // gpt-4o-mini-transcribe and other models use simpler API
    const response = await this.client.audio.transcriptions.create({
      model,
      file,
      language: options?.language || 'en',
    })

    return {
      text: response.text,
      language: 'en',
      duration: 0,
    }
  }
}
