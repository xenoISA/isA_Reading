import OpenAI from 'openai'

export interface PronunciationAnalysis {
  // Scores (0-100)
  overall_score: number
  accuracy_score: number      // Did they read the correct words?
  pronunciation_score: number // How well did they pronounce individual words?
  fluency_score: number       // Smoothness, pace, hesitations (merged concept)
  intonation_score: number    // Pitch patterns, stress, expression
  completeness_score: number  // How much of the text was read?

  // Detailed feedback
  pace: 'too-slow' | 'slow' | 'good' | 'fast' | 'too-fast'
  mispronounced: MispronunciationDetail[]
  skipped: string[]
  fluency_feedback: string    // smoothness, hesitations, natural flow — one concept
  intonation_feedback: string // pitch, stress, expression feedback
  reference_comparison: string // how child compares to standard/model reading
  pronunciation_tips: string[]
  encouragement: string
}

export interface MispronunciationDetail {
  word: string
  expected_sounds: string  // phonetic guide
  student_said: string     // what it sounded like
  tip: string              // friendly correction
}

const PROMPT_WITH_REFERENCE = `You are an expert English pronunciation and reading coach for K12 children.

You will receive TWO audio recordings:
1. FIRST AUDIO: A reference/model reading (standard TTS pronunciation — this is the "ideal")
2. SECOND AUDIO: A child's reading attempt

Compare the child's reading against both the reference audio AND the target text.

TARGET TEXT:
{target_text}

VOCABULARY KEYWORDS (pay extra attention):
{keywords}

Evaluate these dimensions:

1. **ACCURACY** (0-100): Did they read the correct words? Skip any? Add any?

2. **PRONUNCIATION** (0-100): How well did they pronounce each word compared to the reference?
   - Compare vowel sounds, consonant clarity, word stress
   - Note specific words where pronunciation differs from the reference
   - For each mispronounced word, give a phonetic guide (e.g., "FOR-est" not "for-EST")

3. **FLUENCY** (0-100): How smooth and natural was the reading?
   - Was the pace appropriate (not too fast, not too slow)?
   - Were there awkward pauses or hesitations mid-sentence?
   - Did they read in natural phrases or word-by-word?
   - Compare the rhythm and flow to the reference audio

4. **INTONATION** (0-100): Did they use appropriate pitch and expression?
   - Did their voice rise at questions and fall at statements?
   - Did they emphasize important words naturally?
   - Was the reading expressive or flat/monotone?
   - Did they pause at commas and periods?
   - Compare their melody/pitch patterns to the reference

5. **COMPLETENESS** (0-100): How much of the text did they read?

Also provide:
- **reference_comparison**: 2-3 sentences comparing the child's reading to the model reading. What did they do similarly? What differed? Be specific and encouraging.

Respond with ONLY valid JSON, no markdown:
{"overall_score":85,"accuracy_score":90,"pronunciation_score":80,"fluency_score":85,"intonation_score":75,"completeness_score":100,"pace":"good","mispronounced":[{"word":"forest","expected_sounds":"FOR-est","student_said":"for-EST","tip":"Stress the first part: FOR-est"}],"skipped":[],"fluency_feedback":"Your reading was smooth with good pacing. You paused naturally at the period.","intonation_feedback":"You read with nice expression! Try raising your voice slightly at questions.","reference_comparison":"Your pronunciation was very close to the model reading. The word 'forest' had slightly different stress - the model says FOR-est with emphasis on the first syllable.","pronunciation_tips":["Tip 1","Tip 2"],"encouragement":"Great job!"}`

const PROMPT_WITHOUT_REFERENCE = `You are an expert English pronunciation and reading coach for K12 children.

Listen to the audio recording of a child reading aloud.

TARGET TEXT:
{target_text}

VOCABULARY KEYWORDS (pay extra attention):
{keywords}

Evaluate these dimensions:

1. **ACCURACY** (0-100): Did they read the correct words? Skip any? Add any?

2. **PRONUNCIATION** (0-100): How well did they pronounce each word?
   - Note vowel sounds, consonant clarity, word stress
   - For mispronounced words, give a phonetic guide

3. **FLUENCY** (0-100): How smooth and natural was the reading?
   - Pace, hesitations, natural phrasing vs word-by-word reading

4. **INTONATION** (0-100): Did they use appropriate pitch and expression?
   - Voice rising at questions, falling at statements?
   - Natural emphasis on important words?
   - Expressive or flat/monotone?
   - Appropriate pauses at punctuation?

5. **COMPLETENESS** (0-100): How much of the text did they read?

Respond with ONLY valid JSON, no markdown:
{"overall_score":85,"accuracy_score":90,"pronunciation_score":80,"fluency_score":85,"intonation_score":75,"completeness_score":100,"pace":"good","mispronounced":[{"word":"forest","expected_sounds":"FOR-est","student_said":"for-EST","tip":"Stress the first part: FOR-est"}],"skipped":[],"fluency_feedback":"Feedback about smoothness and pace","intonation_feedback":"Feedback about pitch and expression","reference_comparison":"","pronunciation_tips":["Tip 1","Tip 2"],"encouragement":"Great job!"}`

export class OpenAIPronunciationAnalyzer {
  private client: OpenAI

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY })
  }

  async analyze(
    studentAudio: Buffer,
    targetText: string,
    keywords: string[] = [],
    referenceAudio?: Buffer // TTS reference audio (optional)
  ): Promise<PronunciationAnalysis> {
    const hasReference = !!referenceAudio

    const prompt = (hasReference ? PROMPT_WITH_REFERENCE : PROMPT_WITHOUT_REFERENCE)
      .replace('{target_text}', targetText)
      .replace('{keywords}', keywords.length > 0 ? keywords.join(', ') : '(none)')

    // Build content array with text + audio(s)
    const content: Record<string, unknown>[] = [
      { type: 'text', text: prompt },
    ]

    if (hasReference && referenceAudio) {
      // Reference audio first (mp3 from TTS)
      content.push({
        type: 'input_audio',
        input_audio: {
          data: referenceAudio.toString('base64'),
          format: 'mp3',
        },
      })
    }

    // Student audio (wav from client-side conversion)
    content.push({
      type: 'input_audio',
      input_audio: {
        data: studentAudio.toString('base64'),
        format: 'wav',
      },
    })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.client.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-audio-preview',
        messages: [{ role: 'user', content }],
        temperature: 0.3,
        modalities: ['text'],
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      throw new Error(`OpenAI audio API error: ${response.status} ${errBody}`)
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content
    if (!rawContent) throw new Error('Empty response from GPT-4o audio')

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(jsonMatch[0]) as PronunciationAnalysis

    return {
      overall_score: clamp(parsed.overall_score),
      accuracy_score: clamp(parsed.accuracy_score),
      pronunciation_score: clamp(parsed.pronunciation_score),
      fluency_score: clamp(parsed.fluency_score),
      intonation_score: clamp(parsed.intonation_score),
      completeness_score: clamp(parsed.completeness_score),
      pace: parsed.pace || 'good',
      mispronounced: parsed.mispronounced || [],
      skipped: parsed.skipped || [],
      fluency_feedback: parsed.fluency_feedback || '',
      intonation_feedback: parsed.intonation_feedback || '',
      reference_comparison: parsed.reference_comparison || '',
      pronunciation_tips: parsed.pronunciation_tips || [],
      encouragement: parsed.encouragement || 'Great effort!',
    }
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n || 0)))
}
