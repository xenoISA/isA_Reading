import type { LLMProvider, LLMAssessment, AssessmentContext } from '@/types'

const PARAGRAPH_PROMPT = `You are a friendly English reading tutor for K12 students.

Compare the student's reading of this paragraph against the target text and provide feedback.

{context_info}

Target paragraph:
{target_text}

Vocabulary words to focus on:
{keywords}

Student's reading (transcribed):
{student_text}

Respond in JSON format:
{
  "accuracy_score": <0-100>,
  "mispronounced_words": [{"expected": "word", "actual": "what student said", "position": <word index>}],
  "skipped_words": ["words the student missed"],
  "added_words": ["extra words the student said"],
  "keyword_accuracy": [{"word": "vocabulary word", "correct": true/false}],
  "feedback": "<2-3 specific corrections focusing on the vocabulary words, in simple encouraging language>",
  "encouragement": "<a short encouraging message appropriate for a child>"
}

Rules:
- Pay special attention to the vocabulary words listed above
- Be encouraging and age-appropriate
- Focus on the most impactful corrections, not every tiny error
- If vocabulary words were pronounced correctly, praise that specifically
- Keep feedback under 3 sentences`

export class OpenRouterLLMProvider implements LLMProvider {
  readonly name = 'openrouter'
  private apiKey: string
  private model: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || ''
    this.model = model || process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it'
  }

  async assess(
    targetText: string,
    studentText: string,
    context?: AssessmentContext
  ): Promise<LLMAssessment> {
    const contextParts: string[] = []
    if (context?.difficulty) contextParts.push(`Reading level: ${context.difficulty}/5`)
    if (context?.studentAge) contextParts.push(`Student age: ~${context.studentAge}`)
    if (context?.paragraphIndex !== undefined && context?.totalParagraphs) {
      contextParts.push(`This is paragraph ${context.paragraphIndex + 1} of ${context.totalParagraphs}`)
    }
    const contextInfo = contextParts.length > 0 ? contextParts.join('. ') + '.' : ''

    const keywordsText = context?.keywords?.length
      ? context.keywords.join(', ')
      : '(no specific vocabulary words)'

    const prompt = PARAGRAPH_PROMPT
      .replace('{target_text}', targetText)
      .replace('{student_text}', studentText)
      .replace('{context_info}', contextInfo)
      .replace('{keywords}', keywordsText)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} ${err}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) throw new Error('Empty response from OpenRouter')

    const parsed = JSON.parse(content) as LLMAssessment
    return {
      accuracy_score: Math.max(0, Math.min(100, parsed.accuracy_score)),
      mispronounced_words: parsed.mispronounced_words || [],
      skipped_words: parsed.skipped_words || [],
      added_words: parsed.added_words || [],
      feedback: parsed.feedback || 'Good try! Keep practicing.',
      encouragement: parsed.encouragement || 'You\'re doing great!',
      keyword_accuracy: parsed.keyword_accuracy || [],
    }
  }
}
