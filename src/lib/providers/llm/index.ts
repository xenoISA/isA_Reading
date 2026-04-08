import type { LLMProvider } from '@/types'
import { OpenRouterLLMProvider } from './openrouter'

export type LLMProviderName = 'openrouter'

export function createLLMProvider(
  name: LLMProviderName = 'openrouter',
  apiKey?: string,
  model?: string
): LLMProvider {
  switch (name) {
    case 'openrouter':
      return new OpenRouterLLMProvider(apiKey, model)
    default:
      throw new Error(`Unknown LLM provider: ${name}`)
  }
}

export { OpenRouterLLMProvider }
