'use client'

interface Props {
  activeTab: 'read' | 'dashboard'
  onTabChange: (tab: 'read' | 'dashboard') => void
  streak?: number
  points?: number
  avatar?: string
}

export default function BottomNav({ activeTab, onTabChange, streak = 0, points = 0, avatar }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 backdrop-blur-sm safe-area-bottom" aria-label="Main navigation">
      <div className="max-w-2xl mx-auto flex items-center justify-around py-2 px-4">
        <button
          onClick={() => onTabChange('read')}
          className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-colors min-w-[64px] ${
            activeTab === 'read'
              ? 'text-accent'
              : 'text-muted hover:text-foreground'
          }`}
          aria-label="Read"
          aria-current={activeTab === 'read' ? 'page' : undefined}
        >
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'read' ? 2.5 : 1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-[10px] font-semibold">Read</span>
        </button>

        {/* Stats pill in center */}
        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-surface-alt border border-border text-xs font-bold tabular-nums">
          {streak > 0 && (
            <span className="text-orange-500" title="Day streak">
              🔥 {streak}
            </span>
          )}
          <span className="text-amber-500" title="Points">
            ⭐ {points}
          </span>
        </div>

        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-colors min-w-[64px] ${
            activeTab === 'dashboard'
              ? 'text-accent'
              : 'text-muted hover:text-foreground'
          }`}
          aria-label="My Profile"
          aria-current={activeTab === 'dashboard' ? 'page' : undefined}
        >
          <span className="text-xl leading-none">{avatar || '👤'}</span>
          <span className="text-[10px] font-semibold">Me</span>
        </button>
      </div>
    </nav>
  )
}
