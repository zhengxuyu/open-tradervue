import { Link, useLocation } from 'react-router-dom'
import { Icon } from './Icon'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'
import { getStoredUser, logout } from '@/services/auth'

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

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation()
  const user = getStoredUser()

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 h-full w-64 border-r border-outline-variant/20 bg-surface-container-low font-body antialiased">
      <div className="flex flex-col h-full">
        <div className="p-6 mb-2">
          <h1 className="text-lg font-bold tracking-tight text-on-surface">Open Tradervue</h1>
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
                onClick={() => onNavigate?.()}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 border-l-2 border-transparent'
                )}
              >
                <Icon name={item.icon} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-outline-variant/20">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
              <Icon name="person" className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-surface truncate">
                {user?.username || 'Account'}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  to="/settings"
                  onClick={() => onNavigate?.()}
                  className={cn(
                    'text-xs font-label transition-colors',
                    location.pathname === '/settings'
                      ? 'text-primary'
                      : 'text-outline hover:text-on-surface-variant'
                  )}
                >
                  Settings
                </Link>
                <span className="text-outline-variant text-xs">|</span>
                <button
                  onClick={logout}
                  className="text-xs font-label text-outline hover:text-on-surface-variant transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  )
}
