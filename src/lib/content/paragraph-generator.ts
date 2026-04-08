import type { Theme, Paragraph, Material } from '@/types'

interface GenerateOptions {
  title?: string
  rawText: string
  difficulty: number
  theme: Theme
  keywordsPerParagraph?: number
}

interface GeneratedMaterial {
  title: string
  paragraphs: Paragraph[]
  content: string
  word_count: number
}

const DIFFICULTY_GUIDELINES: Record<number, string> = {
  1: `Level 1 (K1-K2, age 5-7):
- Use very simple, short sentences (5-10 words each)
- Only basic vocabulary (common everyday words)
- 3 paragraphs, each 2-3 sentences
- Keywords should be simple but worth learning (colors, animals, actions)
- Total: 50-80 words`,

  2: `Level 2 (G1-G2, age 7-8):
- Use simple sentences with some compound sentences
- Common vocabulary with a few new words
- 4 paragraphs, each 2-4 sentences
- Keywords should be grade-appropriate vocabulary
- Total: 80-120 words`,

  3: `Level 3 (G3-G4, age 9-10):
- Use varied sentence structures
- Intermediate vocabulary, introduce topic-specific terms
- 5 paragraphs, each 3-5 sentences
- Keywords should challenge but not frustrate
- Total: 130-180 words`,

  4: `Level 4 (G5-G6, age 11-12):
- Use complex sentences with subordinate clauses
- Advanced vocabulary, domain-specific terminology
- 6 paragraphs, each 3-6 sentences
- Keywords should expand academic vocabulary
- Total: 200-260 words`,

  5: `Level 5 (G7+, age 13+):
- Use sophisticated sentence structures and transitions
- Challenging vocabulary, abstract concepts
- 7 paragraphs, each 4-7 sentences
- Keywords should be college-prep level vocabulary
- Total: 300-400 words`,
}

const GENERATION_PROMPT = `You are an expert K12 English reading content creator. Create a structured reading passage for children.

SOURCE MATERIAL (use as inspiration, rewrite completely):
{raw_text}

REQUIREMENTS:
- Theme: {theme}
- {difficulty_guidelines}

CRITICAL RULES FOR KEYWORDS:
- Each paragraph must have exactly {keywords_count} keywords
- Keywords MUST be pronunciation-worthy words (NOT stop words like "the", "and", "is", "a", "it")
- Keywords should be words that a student at this level would benefit from practicing pronunciation
- Choose words with interesting sounds, multiple syllables, or common mispronunciation patterns
- For Level 1-2: words like "butterfly", "garden", "beautiful" (NOT "is", "the", "and")
- For Level 3-4: words like "enormous", "investigate", "atmosphere"
- For Level 5: words like "phenomenon", "sophisticated", "metamorphosis"

CONTENT QUALITY RULES:
- Write original content inspired by the source — do NOT copy
- Make it engaging, educational, and age-appropriate
- Use a narrative or informational tone appropriate for the level
- Each paragraph should flow naturally to the next
- Include sensory details and concrete examples
- NO violence, scary content, or inappropriate themes

{title_instruction}

Respond ONLY with valid JSON:
{{
  "title": "engaging title",
  "paragraphs": [
    {{ "index": 0, "text": "paragraph text here", "keywords": ["word1", "word2", "word3"] }},
    ...
  ]
}}`

export async function generateMaterial(options: GenerateOptions): Promise<GeneratedMaterial> {
  const {
    rawText,
    difficulty,
    theme,
    keywordsPerParagraph = 3,
  } = options

  const difficultyGuidelines = DIFFICULTY_GUIDELINES[difficulty] || DIFFICULTY_GUIDELINES[3]

  const titleInstruction = options.title
    ? `Use this title: "${options.title}"`
    : 'Create an engaging, age-appropriate title.'

  const prompt = GENERATION_PROMPT
    .replace('{raw_text}', rawText.slice(0, 2000)) // limit input size
    .replace('{theme}', theme)
    .replace('{difficulty_guidelines}', difficultyGuidelines)
    .replace('{keywords_count}', String(keywordsPerParagraph))
    .replace('{title_instruction}', titleInstruction)

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const model = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it'

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter error: ${response.status} ${err}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content
  if (!content) throw new Error('Empty LLM response')

  const parsed = JSON.parse(content)

  // Build full content from paragraphs
  const paragraphs: Paragraph[] = (parsed.paragraphs || []).map((p: Paragraph, i: number) => ({
    index: i,
    text: p.text,
    keywords: filterKeywords(p.keywords || [], difficulty),
  }))

  const fullContent = paragraphs.map(p => p.text).join('\n\n')
  const wordCount = fullContent.split(/\s+/).length

  return {
    title: parsed.title || options.title || 'Untitled',
    paragraphs,
    content: fullContent,
    word_count: wordCount,
  }
}

// Filter out stop words and ensure keyword quality
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'must', 'need',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'and', 'but', 'or', 'not', 'no', 'so', 'if', 'then', 'than', 'too', 'very',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about',
  'into', 'over', 'after', 'just', 'also', 'now', 'here', 'there', 'when',
  'what', 'which', 'who', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so',
])

function filterKeywords(keywords: string[], difficulty: number): string[] {
  const minLength = difficulty <= 2 ? 3 : difficulty <= 4 ? 4 : 5

  return keywords
    .filter(w => !STOP_WORDS.has(w.toLowerCase()))
    .filter(w => w.length >= minLength)
    .slice(0, 5) // max 5 per paragraph
}

// Generate a Material ID
export function generateMaterialId(theme: Theme, difficulty: number): string {
  const timestamp = Date.now().toString(36)
  return `${theme}-${difficulty}-${timestamp}`
}

// Full pipeline: raw text → Material object
export async function createMaterialFromText(
  rawText: string,
  theme: Theme,
  difficulty: number,
  title?: string
): Promise<Omit<Material, 'created_at'>> {
  const generated = await generateMaterial({
    title,
    rawText,
    difficulty,
    theme,
  })

  return {
    id: generateMaterialId(theme, difficulty),
    title: generated.title,
    content: generated.content,
    paragraphs: generated.paragraphs,
    difficulty,
    theme,
    domain: theme,
    word_count: generated.word_count,
  }
}
