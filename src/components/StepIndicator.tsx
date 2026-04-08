'use client'

const STEPS = [
  { key: 'select', label: 'Pick' },
  { key: 'read', label: 'Listen' },
  { key: 'record', label: 'Read' },
  { key: 'feedback', label: 'Results' },
] as const

type StepKey = 'select' | 'read' | 'record' | 'processing' | 'feedback'

const STEP_ORDER: Record<StepKey, number> = {
  select: 0,
  read: 1,
  record: 2,
  processing: 2,
  feedback: 3,
}

interface Props {
  currentStep: StepKey
}

export default function StepIndicator({ currentStep }: Props) {
  const currentIndex = STEP_ORDER[currentStep]

  return (
    <nav aria-label="Progress" className="flex items-center justify-center gap-1 sm:gap-2 px-4 py-3">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex
        const isDone = i < currentIndex

        return (
          <div key={step.key} className="flex items-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`size-7 sm:size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                  isDone
                    ? 'bg-green-400 text-white'
                    : isActive
                      ? 'bg-accent text-white ring-4 ring-orange-200'
                      : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isDone ? (
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-[10px] sm:text-xs font-medium ${
                isActive ? 'text-accent' : isDone ? 'text-green-600' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 sm:w-10 h-0.5 rounded-full mb-4 ${
                i < currentIndex ? 'bg-green-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        )
      })}
    </nav>
  )
}
