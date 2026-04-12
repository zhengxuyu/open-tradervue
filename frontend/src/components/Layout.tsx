import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Citation } from './Citation'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile by default, shown on lg+ */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile header with hamburger */}
      <div className="lg:hidden sticky top-0 z-20 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setSidebarOpen(true)} className="text-on-surface-variant">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="text-sm font-bold" style={{ fontFamily: "'Space Grotesk', monospace" }}>
          TradeJournal<span className="text-primary">.dev</span>
        </span>
      </div>

      <main className="lg:ml-64 min-h-screen pb-8">
        {children}
      </main>
      <Citation />
    </div>
  )
}
