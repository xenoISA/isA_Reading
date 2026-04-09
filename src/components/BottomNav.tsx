'use client'

interface Props {
  activeTab: 'read' | 'wordbank' | 'dashboard'
  onTabChange: (tab: 'read' | 'wordbank' | 'dashboard') => void
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

        <button
          onClick={() => onTabChange('wordbank')}
          className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-colors min-w-[64px] ${
            activeTab === 'wordbank'
              ? 'text-accent'
              : 'text-muted hover:text-foreground'
          }`}
          aria-label="Word Bank"
          aria-current={activeTab === 'wordbank' ? 'page' : undefined}
        >
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'wordbank' ? 2.5 : 1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
          </svg>
          <span className="text-[10px] font-semibold">Words</span>
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
