import type { STTProvider } from '@/types'
import { OpenAISTTProvider } from './openai'

export type STTProviderName = 'openai'

export function createSTTProvider(
  name: STTProviderName = 'openai',
  apiKey?: string
): STTProvider {
  switch (name) {
    case 'openai':
      return new OpenAISTTProvider(apiKey)
    default:
      throw new Error(`Unknown STT provider: ${name}`)
  }
}

export { OpenAISTTProvider }
