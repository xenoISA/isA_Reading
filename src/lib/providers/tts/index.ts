import type { TTSProvider } from '@/types'
import { OpenAITTSProvider } from './openai'

export type TTSProviderName = 'openai'

export function createTTSProvider(
  name: TTSProviderName = 'openai',
  apiKey?: string
): TTSProvider {
  switch (name) {
    case 'openai':
      return new OpenAITTSProvider(apiKey)
    default:
      throw new Error(`Unknown TTS provider: ${name}`)
  }
}

export { OpenAITTSProvider }
