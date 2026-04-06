import { Link, useLocation } from 'react-router-dom'
import { Icon } from './Icon'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: 'dashboard' },
  { name: 'Trades', href: '/trades', icon: 'analytics' },
  { name: 'Import', href: '/import', icon: 'cloud_upload' },
  { name: 'Calendar', href: '/calendar', icon: 'calendar_month' },
  { name: 'Journal', href: '/journal', icon: 'auto_stories' },
  { name: 'Analysis', href: '/analysis', icon: 'monitoring' },
  { name: 'Statistics', href: '/statistics', icon: 'leaderboard' },
  { name: 'Charts', href: '/charts', icon: 'show_chart' },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 h-full w-64 border-r border-[#1b2025] bg-surface-container-low font-body antialiased">
      <div className="flex flex-col h-full">
        <div className="p-6 mb-2">
          <h1 className="text-lg font-bold tracking-tight text-white">Open Tradervue</h1>
          <p className="text-xs font-label uppercase tracking-widest text-primary/60 mt-1">
            Pro Account
          </p>
        </div>

        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.href)

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent'
                )}
              >
                <Icon name={item.icon} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#1b2025]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
              <Icon name="person" className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Pro Account</p>
              <p className="text-xs text-slate-500 font-label">Settings</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
