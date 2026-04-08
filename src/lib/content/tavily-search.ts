import type { Theme } from '@/types'

export interface TavilyResult {
  title: string
  url: string
  content: string // extracted text
  raw_content?: string
  score: number
}

export interface SearchOptions {
  theme: Theme
  difficulty?: number
  query?: string // override auto-generated query
  limit?: number
}

// Maps theme + difficulty to effective search queries
function buildSearchQuery(theme: Theme, difficulty?: number): string {
  const levelHint = difficulty
    ? { 1: 'very simple beginner', 2: 'easy elementary', 3: 'intermediate', 4: 'advanced', 5: 'challenging complex' }[difficulty] || ''
    : ''

  const themeQueries: Record<Theme, string> = {
    animals: 'interesting facts about animals for kids reading passage',
    adventure: 'short adventure story for children reading',
    science: 'science explanation for kids reading comprehension',
    fantasy: 'fantasy short story for children reading passage',
    sports: 'sports story for young readers',
    'daily-life': 'daily life story for children reading practice',
    nature: 'nature and environment reading for kids',
    history: 'history story for young readers educational',
  }

  return `${levelHint} ${themeQueries[theme]}`.trim()
}

export async function searchContent(options: SearchOptions): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error('TAVILY_API_KEY not configured')

  const query = options.query || buildSearchQuery(options.theme, options.difficulty)
  const limit = Math.min(options.limit || 5, 10)

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      include_raw_content: true,
      max_results: limit,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Tavily API error: ${response.status} ${err}`)
  }

  const data = await response.json()

  return (data.results || []).map((r: Record<string, unknown>) => ({
    title: r.title as string,
    url: r.url as string,
    content: r.content as string,
    raw_content: r.raw_content as string | undefined,
    score: r.score as number,
  }))
}

// Extract clean text from Tavily result, preferring raw_content
export function extractCleanText(result: TavilyResult, maxWords?: number): string {
  let text = result.raw_content || result.content || ''

  // Strip HTML tags if present
  text = text.replace(/<[^>]+>/g, ' ')

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim()

  // Remove common web artifacts
  text = text.replace(/Cookie Policy|Privacy Policy|Subscribe|Sign up|Newsletter/gi, '')
  text = text.replace(/\[.*?\]/g, '') // remove [citations]
  text = text.replace(/\(.*?\.com.*?\)/g, '') // remove (url.com) references

  // Trim to max words if specified
  if (maxWords) {
    const words = text.split(/\s+/)
    if (words.length > maxWords) {
      text = words.slice(0, maxWords).join(' ')
    }
  }

  return text.trim()
}
