'use client'

interface Props {
  level: number
  score: number
  onComplete: () => void
}

function getEncouragement(level: number): string {
  switch (level) {
    case 1: return 'Great start! Let\u2019s build your reading skills together.'
    case 2: return 'Nice reading! You\u2019re already off to a great start.'
    case 3: return 'Impressive! You\u2019re a confident reader.'
    case 4: return 'Excellent! You\u2019re reading at an advanced level.'
    case 5: return 'Outstanding! You\u2019re a master reader.'
    default: return 'Great start! Let\u2019s build your reading skills together.'
  }
}

export default function OnboardingCelebration({ level, score, onComplete }: Props) {
  return (
    <div className="animate-scale-in py-8 text-center space-y-6 max-w-sm mx-auto">
      {/* Party popper */}
      <p className="text-7xl animate-bounce-in">{'\uD83C\uDF89'}</p>

      {/* Level reveal */}
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          You&apos;re a Level{' '}
          <span className="text-accent animate-score-count inline-block">{level}</span>{' '}
          Reader!
        </h2>
      </div>

      {/* Score */}
      <p className="text-lg text-muted">
        You scored <span className="font-bold text-foreground">{score}%</span> on your first reading!
      </p>

      {/* First badge */}
      <div
        className="mx-auto p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl max-w-xs animate-bounce-in"
        style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
      >
        <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">Achievement Unlocked!</p>
        <p className="text-4xl mb-1">{'\uD83D\uDCD6'}</p>
        <p className="font-bold text-amber-800">First Steps</p>
        <p className="text-sm text-amber-600 mt-1">Complete your first reading</p>
      </div>

      {/* Encouragement */}
      <p className="text-muted text-sm px-4">{getEncouragement(level)}</p>

      {/* CTA */}
      <button
        onClick={onComplete}
        className="w-full py-4 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold text-base transition-all active:scale-95 shadow-md"
      >
        Start Reading!
      </button>
    </div>
  )
}
