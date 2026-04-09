import type { Material, Theme } from '@/types'
export { getCompletedMaterialIds } from './reading-history'

interface RecommendationContext {
  readingLevel: number
  avgAccuracy: number
  errorPatterns?: { category: string; count: number; example_words: string[] }[]
  completedMaterialIds: string[]
  preferredThemes: Theme[]
}

interface Recommendation {
  material: Material
  reason: string
}

export function getRecommendations(materials: Material[], ctx: RecommendationContext): Recommendation[] {
  const recommendations: Recommendation[] = []
  const completed = new Set(ctx.completedMaterialIds)

  // 1. Level-up suggestion: if avg accuracy > 85%, suggest next level
  if (ctx.avgAccuracy > 85 && ctx.readingLevel < 5) {
    const nextLevelMaterials = materials.filter(m => m.difficulty === ctx.readingLevel + 1 && !completed.has(m.id))
    if (nextLevelMaterials.length > 0) {
      const pick = nextLevelMaterials[Math.floor(Math.random() * nextLevelMaterials.length)]
      recommendations.push({
        material: pick,
        reason: `You're scoring ${ctx.avgAccuracy}%+ — ready for Level ${ctx.readingLevel + 1}!`,
      })
    }
  }

  // 2. Theme diversity: suggest a theme the student hasn't tried much
  const themeCounts = new Map<Theme, number>()
  for (const m of materials) {
    if (completed.has(m.id)) {
      themeCounts.set(m.theme, (themeCounts.get(m.theme) || 0) + 1)
    }
  }
  const allThemes: Theme[] = ['animals', 'adventure', 'science', 'fantasy', 'sports', 'daily-life', 'nature', 'history']
  const underexplored = allThemes.filter(t => (themeCounts.get(t) || 0) < 2)
  if (underexplored.length > 0) {
    const targetTheme = underexplored[Math.floor(Math.random() * underexplored.length)]
    const candidates = materials.filter(m =>
      m.theme === targetTheme &&
      !completed.has(m.id) &&
      m.difficulty <= ctx.readingLevel + 1 &&
      m.difficulty >= Math.max(1, ctx.readingLevel - 1)
    )
    if (candidates.length > 0 && recommendations.length < 3) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)]
      if (!recommendations.find(r => r.material.id === pick.id)) {
        recommendations.push({
          material: pick,
          reason: `Try a ${targetTheme} story — explore new topics!`,
        })
      }
    }
  }

  // 3. Right-level material for practice
  const sameLevelUnread = materials.filter(m =>
    m.difficulty === ctx.readingLevel &&
    !completed.has(m.id) &&
    !recommendations.find(r => r.material.id === m.id)
  )
  if (sameLevelUnread.length > 0 && recommendations.length < 3) {
    // Prefer preferred themes
    const preferred = sameLevelUnread.filter(m => ctx.preferredThemes.includes(m.theme))
    const pick = preferred.length > 0
      ? preferred[Math.floor(Math.random() * preferred.length)]
      : sameLevelUnread[Math.floor(Math.random() * sameLevelUnread.length)]
    recommendations.push({
      material: pick,
      reason: 'Great match for your current level',
    })
  }

  return recommendations.slice(0, 3)
}

export function getLevelUpNudge(avgAccuracy: number, readingLevel: number): string | null {
  if (readingLevel >= 5) return null
  if (avgAccuracy >= 90) return `Scoring ${Math.round(avgAccuracy)}% — you're ready for Level ${readingLevel + 1}!`
  if (avgAccuracy >= 85) return `Almost there! A few more strong reads and Level ${readingLevel + 1} unlocks`
  return null
}
