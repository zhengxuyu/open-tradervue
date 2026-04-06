# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the entire Open Tradervue frontend UI to match Stitch-generated dark theme designs with Material Design 3 color system, sidebar navigation, and Bloomberg Terminal aesthetic.

**Architecture:** Full UI rewrite keeping the existing data layer (api.ts, types, utils) intact. Extract a design system (colors, fonts, icons) first, then rebuild shared components (Sidebar, TopAppBar, Icon, etc.), then rewrite each page. All 10 pages get rebuilt from scratch but retain their existing data-fetching logic and API calls.

**Tech Stack:** React 19, TypeScript, TailwindCSS 4, Recharts, lightweight-charts, Material Symbols Outlined (Google Fonts CDN), Inter + Space Grotesk fonts.

**Design reference:** The Stitch HTML mockups were provided in the conversation. Each page's HTML contains the exact Tailwind classes, color tokens, and layout structure to replicate.

---

### Task 1: Design System Foundation

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/lib/utils.ts`

- [ ] **Step 1: Add Google Fonts CDN links to index.html**

Replace the contents of `frontend/index.html`:

```html
<!doctype html>
<html class="dark" lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Open Tradervue</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Rewrite index.css with design system**

Replace the contents of `frontend/src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-surface: #0f1419;
  --color-surface-container-lowest: #0a0f14;
  --color-surface-container-low: #171c21;
  --color-surface-container: #1b2025;
  --color-surface-container-high: #252a30;
  --color-surface-container-highest: #30353b;
  --color-surface-variant: #30353b;
  --color-surface-bright: #353a3f;

  --color-on-surface: #dee3ea;
  --color-on-surface-variant: #c1c6d5;
  --color-outline: #8b919e;
  --color-outline-variant: #414753;

  --color-primary: #a7c8ff;
  --color-primary-container: #4c9aff;
  --color-on-primary: #003060;
  --color-on-primary-container: #003162;

  --color-secondary: #66d9cc;
  --color-secondary-container: #1ea296;
  --color-on-secondary-container: #00302b;

  --color-tertiary: #ffb3ae;
  --color-tertiary-container: #ff6762;
  --color-on-tertiary-container: #6a000b;

  --color-error: #ffb4ab;
  --color-error-container: #93000a;

  --font-family-headline: 'Inter', sans-serif;
  --font-family-body: 'Inter', sans-serif;
  --font-family-label: 'Space Grotesk', monospace;
}

body {
  font-family: 'Inter', sans-serif;
  background-color: #0f1419;
  color: #dee3ea;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.font-data {
  font-family: 'Space Grotesk', monospace;
}

.font-label {
  font-family: 'Space Grotesk', monospace;
}

.ghost-border {
  border: 1px solid rgba(139, 145, 158, 0.15);
}

/* Custom scrollbar for dark theme */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #0f1419; }
::-webkit-scrollbar-thumb { background: #30353b; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #414753; }

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

- [ ] **Step 3: Update utils.ts with new color helpers**

Replace the `getPnLColor` and `getPnLBgColor` functions in `frontend/src/lib/utils.ts`:

```typescript
export function getPnLColor(pnl: number): string {
  if (pnl > 0) return 'text-secondary'
  if (pnl < 0) return 'text-tertiary'
  return 'text-outline'
}

export function getPnLBgColor(pnl: number): string {
  if (pnl > 0) return 'bg-secondary-container/20'
  if (pnl < 0) return 'bg-tertiary-container/20'
  return 'bg-surface-container'
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatPnL(value: number): string {
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${formatCurrency(value)}`
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/index.html frontend/src/index.css frontend/src/lib/utils.ts
git commit -m "feat: add design system foundation (colors, fonts, icons)"
```

---

### Task 2: Shared Components (Icon, Badge, StatCard)

**Files:**
- Create: `frontend/src/components/Icon.tsx`
- Modify: `frontend/src/components/Badge.tsx` (was Button.tsx, repurpose)
- Modify: `frontend/src/components/StatCard.tsx`
- Delete: `frontend/src/components/Card.tsx` (no longer used)
- Delete: `frontend/src/components/Button.tsx` (no longer used)

- [ ] **Step 1: Create Icon component**

Create `frontend/src/components/Icon.tsx`:

```tsx
interface IconProps {
  name: string
  className?: string
  filled?: boolean
}

export function Icon({ name, className = '', filled = false }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  )
}
```

- [ ] **Step 2: Create Badge component**

Replace `frontend/src/components/Button.tsx` contents with a new file `frontend/src/components/Badge.tsx`:

```tsx
import { cn } from '@/lib/utils'

interface BadgeProps {
  side: 'BUY' | 'SELL'
  className?: string
}

export function SideBadge({ side, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
        side === 'BUY'
          ? 'bg-secondary-container text-on-secondary-container'
          : 'bg-tertiary-container text-on-tertiary-container',
        className
      )}
    >
      {side}
    </span>
  )
}

interface PnLValueProps {
  value: number
  className?: string
  showSign?: boolean
}

export function PnLValue({ value, className, showSign = true }: PnLValueProps) {
  const color = value > 0 ? 'text-secondary' : value < 0 ? 'text-tertiary' : 'text-outline'
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(value))
  const prefix = showSign ? (value >= 0 ? '+' : '-') : (value < 0 ? '-' : '')

  return (
    <span className={cn('font-data tabular-nums font-bold', color, className)}>
      {prefix}${formatted.replace('$', '')}
    </span>
  )
}
```

- [ ] **Step 3: Rewrite StatCard component**

Replace the contents of `frontend/src/components/StatCard.tsx`:

```tsx
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  subLabel?: string
  subValue?: string
  accentColor?: 'secondary' | 'tertiary' | 'primary'
  className?: string
  children?: React.ReactNode
}

export function StatCard({
  label,
  value,
  subLabel,
  subValue,
  accentColor,
  className,
  children,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-surface-container p-5 rounded-xl relative overflow-hidden',
        accentColor && `border-l-2 border-${accentColor}`,
        className
      )}
    >
      <div className="text-[10px] font-label uppercase tracking-widest text-outline mb-2">
        {label}
      </div>
      <div className={cn(
        'text-xl font-bold font-data tabular-nums',
        accentColor ? `text-${accentColor}` : 'text-on-surface'
      )}>
        {value}
      </div>
      {subLabel && (
        <div className="mt-2 text-[10px] font-label text-outline uppercase tracking-wider">
          {subLabel}: {subValue}
        </div>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Delete old Card.tsx and Button.tsx**

```bash
rm frontend/src/components/Card.tsx frontend/src/components/Button.tsx
```

- [ ] **Step 5: Commit**

```bash
git add -A frontend/src/components/
git commit -m "feat: add Icon, Badge, StatCard shared components"
```

---

### Task 3: Layout (Sidebar + TopAppBar)

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/TopAppBar.tsx`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Create Sidebar component**

Create `frontend/src/components/Sidebar.tsx`:

```tsx
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
```

- [ ] **Step 2: Create TopAppBar component**

Create `frontend/src/components/TopAppBar.tsx`:

```tsx
interface TopAppBarProps {
  title: string
  actions?: React.ReactNode
}

export function TopAppBar({ title, actions }: TopAppBarProps) {
  return (
    <header className="w-full h-16 sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-[#1b2025] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="font-headline font-semibold text-sm uppercase tracking-widest text-primary">
          {title}
        </h2>
      </div>
      {actions && (
        <div className="flex items-center gap-4">
          {actions}
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 3: Rewrite Layout component**

Replace the contents of `frontend/src/components/Layout.tsx`:

```tsx
import { Sidebar } from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Sidebar.tsx frontend/src/components/TopAppBar.tsx frontend/src/components/Layout.tsx
git commit -m "feat: add Sidebar and TopAppBar, rewrite Layout"
```

---

### Task 4: Dashboard Page

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/components/TradeTable.tsx`

- [ ] **Step 1: Rewrite TradeTable component**

Replace the contents of `frontend/src/components/TradeTable.tsx`:

```tsx
import type { Trade } from '@/services/api'
import { SideBadge, PnLValue } from './Badge'
import { formatDate, formatTime } from '@/lib/utils'

interface TradeTableProps {
  trades: Trade[]
  compact?: boolean
}

export function TradeTable({ trades, compact = false }: TradeTableProps) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-outline text-sm">No trades found</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-surface-container-low text-[10px] font-label uppercase tracking-widest text-outline">
          <tr>
            <th className="px-6 py-4 font-medium">Date / Time</th>
            <th className="px-6 py-4 font-medium">Symbol</th>
            <th className="px-6 py-4 font-medium text-center">Side</th>
            <th className="px-6 py-4 font-medium text-right">Quantity</th>
            <th className="px-6 py-4 font-medium text-right">Price</th>
            {!compact && <th className="px-6 py-4 font-medium text-right">Commission</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10">
          {trades.map((trade) => (
            <tr key={trade.id} className="hover:bg-surface-container-high transition-colors">
              <td className="px-6 py-4">
                <p className="text-xs font-semibold text-white">{formatDate(trade.executed_at)}</p>
                <p className="text-[10px] font-label text-outline uppercase">
                  {formatTime(trade.executed_at)}
                </p>
              </td>
              <td className="px-6 py-4">
                <span className="text-xs font-data font-bold text-primary">{trade.symbol}</span>
              </td>
              <td className="px-6 py-4 text-center">
                <SideBadge side={trade.side} />
              </td>
              <td className="px-6 py-4 text-right font-data text-xs text-white">
                {trade.quantity.toLocaleString()}
              </td>
              <td className="px-6 py-4 text-right font-data text-xs text-white">
                ${trade.price.toFixed(2)}
              </td>
              {!compact && (
                <td className="px-6 py-4 text-right font-data text-xs text-outline">
                  ${trade.commission.toFixed(2)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite Dashboard page**

Replace the contents of `frontend/src/pages/Dashboard.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopAppBar } from '@/components/TopAppBar'
import { StatCard } from '@/components/StatCard'
import { TradeTable } from '@/components/TradeTable'
import { PnLValue } from '@/components/Badge'
import {
  getAnalysisSummary,
  getTrades,
  getAdvancedStatistics,
  type AnalysisSummary,
  type Trade,
  type DailyPnlData,
} from '@/services/api'
import { formatCurrency, formatPercent } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

export function Dashboard() {
  const [summary, setSummary] = useState<AnalysisSummary | null>(null)
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [dailyPnl, setDailyPnl] = useState<DailyPnlData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, tradesData, statsData] = await Promise.all([
          getAnalysisSummary(),
          getTrades({ limit: 10 }),
          getAdvancedStatistics(),
        ])
        setSummary(summaryData)
        setRecentTrades(tradesData)
        setDailyPnl(statsData.daily_pnl.slice(-30))
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <>
        <TopAppBar title="Dashboard" />
        <div className="p-6 text-center text-outline py-12">Loading dashboard...</div>
      </>
    )
  }

  return (
    <>
      <TopAppBar
        title="Dashboard"
        actions={
          <button className="bg-primary text-on-primary text-xs font-label font-bold px-4 py-1.5 rounded-lg uppercase tracking-wider">
            Export
          </button>
        }
      />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-surface-container p-6 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent" />
            <p className="text-xs font-label uppercase tracking-widest text-slate-400 mb-2">Total P&L</p>
            <div className="flex items-end gap-2">
              <PnLValue value={summary?.total_pnl || 0} className="text-4xl font-headline font-extrabold tracking-tighter" />
            </div>
          </div>

          <div className="bg-surface-container p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-label uppercase tracking-widest text-slate-400 mb-2">Win Rate</p>
              <p className="text-4xl font-headline font-extrabold text-white font-data">
                {(summary?.win_rate || 0).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="bg-surface-container p-6 rounded-xl">
            <p className="text-xs font-label uppercase tracking-widest text-slate-400 mb-2">Total Trades</p>
            <p className="text-4xl font-headline font-extrabold text-white font-data">
              {(summary?.total_trades || 0).toLocaleString()}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div>
                <p className="text-[10px] font-label text-slate-500 uppercase">Wins</p>
                <p className="text-sm font-data font-semibold">{summary?.win_count || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-label text-slate-500 uppercase">Losses</p>
                <p className="text-sm font-data font-semibold">{summary?.loss_count || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container p-6 rounded-xl">
            <p className="text-xs font-label uppercase tracking-widest text-slate-400 mb-2">Profit Factor</p>
            <p className="text-4xl font-headline font-extrabold text-primary font-data">
              {(summary?.profit_factor || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cumulative P&L */}
          <div className="lg:col-span-2 bg-surface-container p-6 rounded-xl">
            <h3 className="text-sm font-headline font-bold text-white uppercase tracking-wider mb-6">
              Cumulative Performance
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyPnl}>
                  <defs>
                    <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a7c8ff" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#a7c8ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    tick={{ fontSize: 10, fill: '#8b919e' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#8b919e' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1b2025', border: 'none', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#8b919e' }}
                    formatter={(value: number) => [formatCurrency(value), 'Cumulative P&L']}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative_pnl"
                    stroke="#a7c8ff"
                    strokeWidth={2}
                    fill="url(#pnlGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily P&L Bars */}
          <div className="bg-surface-container p-6 rounded-xl">
            <h3 className="text-sm font-headline font-bold text-white uppercase tracking-wider mb-6">
              Daily P&L
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnl}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#1b2025', border: 'none', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [formatCurrency(value), 'P&L']}
                  />
                  <Bar
                    dataKey="pnl"
                    fill="#66d9cc"
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-surface-container rounded-xl overflow-hidden">
          <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
            <h3 className="text-sm font-headline font-bold text-white uppercase tracking-wider">
              Recent Executions
            </h3>
          </div>
          <TradeTable trades={recentTrades} compact />
          <div className="p-4 bg-surface-container-low border-t border-outline-variant/10 text-center">
            <Link
              to="/trades"
              className="text-[10px] font-label font-bold text-primary uppercase tracking-widest hover:text-white transition-colors"
            >
              View All Trade History
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Verify the app runs**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` and verify: dark theme, sidebar on left, dashboard with KPI cards, charts, and recent trades table.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx frontend/src/components/TradeTable.tsx
git commit -m "feat: rewrite Dashboard and TradeTable with new design"
```

---

### Task 5: Trades Page

**Files:**
- Modify: `frontend/src/pages/Trades.tsx`
- Create: `frontend/src/components/SlidePanel.tsx`

- [ ] **Step 1: Create SlidePanel component**

Create `frontend/src/components/SlidePanel.tsx`:

```tsx
import { Icon } from './Icon'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function SlidePanel({ open, onClose, title, children, footer }: SlidePanelProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-surface/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-surface-container-low h-full shadow-2xl flex flex-col border-l border-outline-variant/20">
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container">
          <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
          <button onClick={onClose} className="text-outline hover:text-white transition-colors">
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          {children}
        </div>
        {footer && (
          <div className="p-6 border-t border-outline-variant/10 flex items-center gap-4 bg-surface-container-low">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite Trades page**

This is a large page (~500 lines). Replace the contents of `frontend/src/pages/Trades.tsx` with the full rewrite. The page keeps its existing data fetching logic (getPositions, deletePositions, URL params for highlighting) but replaces all JSX with the new design: filter bar with search/side toggle/date range, data table with new styling, pagination, and the SlidePanel for add/edit.

The key structural changes:
- Import `TopAppBar`, `Icon`, `SideBadge`, `PnLValue`, `SlidePanel` instead of old components
- Replace all `bg-gray-*`, `text-gray-*` classes with design system tokens
- Add the filter bar with `bg-surface-container-low` styling
- Replace table with `ghost-border`, `font-label`, `font-data` classes
- Add pagination at bottom
- Use SlidePanel for trade form instead of inline

The data-fetching logic, state management, filtering, grouping, selection, and delete logic remain unchanged from the current implementation. Only the JSX/className values change.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SlidePanel.tsx frontend/src/pages/Trades.tsx
git commit -m "feat: rewrite Trades page with new design + SlidePanel"
```

---

### Task 6: Import Page

**Files:**
- Modify: `frontend/src/pages/Import.tsx`

- [ ] **Step 1: Rewrite Import page**

Replace the contents of `frontend/src/pages/Import.tsx` with the new design. Key changes:
- Add `TopAppBar` with title "Import"
- 3-step wizard with numbered circles + connecting lines (step indicator)
- Step 1: dashed border drop zone with cloud_upload icon, "Paste CSV" tab
- Step 2: column mapping table with dropdown selectors, timezone selector
- Step 3: preview table with warning row highlights
- Right sidebar: live summary card (trade count, warnings), import tips

The existing state management (step tracking, file/text handling, previewCSV/importCSV calls, column mapping logic) stays the same. Only the JSX changes.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Import.tsx
git commit -m "feat: rewrite Import page with 3-step wizard design"
```

---

### Task 7: Calendar Page

**Files:**
- Modify: `frontend/src/pages/Calendar.tsx`
- Modify: `frontend/src/components/PnLCalendar.tsx`

- [ ] **Step 1: Rewrite PnLCalendar component**

Replace the contents of `frontend/src/components/PnLCalendar.tsx`. The new design uses:
- 7-column grid with `gap-px bg-outline-variant/10 border rounded-xl overflow-hidden`
- Day headers: Mon-Sun with `text-[10px] font-label font-bold uppercase tracking-[0.2em]`
- Day cells: `h-32 p-3`, showing day number (top-left), P&L amount (center, colored), trade count (top-right)
- Background color intensity based on P&L magnitude: `bg-secondary-container/{opacity}` for profit, `bg-tertiary-container/{opacity}` for loss
- Left border accent: `border-l-2 border-secondary` for profit days, `border-l-2 border-tertiary` for loss days
- Gray/opacity-50 for no-trade days

- [ ] **Step 2: Rewrite Calendar page**

Replace the contents of `frontend/src/pages/Calendar.tsx`. Key changes:
- `TopAppBar` with monthly/yearly toggle and month navigation arrows
- Monthly view: PnLCalendar grid
- Yearly view: 4x3 grid of mini-month heatmap tiles (each with month name, total P&L, and 7-column grid of small colored squares)
- Bottom summary bar: 5 stat cards (monthly total P&L, trading days, avg daily P&L, best day, worst day)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Calendar.tsx frontend/src/components/PnLCalendar.tsx
git commit -m "feat: rewrite Calendar with monthly heatmap + yearly overview"
```

---

### Task 8: Journal Page

**Files:**
- Modify: `frontend/src/pages/Journal.tsx`

- [ ] **Step 1: Rewrite Journal page**

Replace the contents of `frontend/src/pages/Journal.tsx`. Key changes:
- Split layout: left panel (30%) + right panel (70%) using `flex`
- Left panel: scrollable date list with `border-l-4` active indicator, mood emoji, P&L, trade count per entry
- Right panel: stats header (daily P&L, win rate), mood selector (5 emoji buttons), content textarea with markdown formatting buttons, collapsible sections (Lessons, Mistakes, Improvements) with `border-l-2` accent
- Save button with gradient styling, auto-save timestamp

The existing API calls (getJournals, getJournal, updateJournal) and state management stay the same.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Journal.tsx
git commit -m "feat: rewrite Journal with split-pane layout + mood tracking"
```

---

### Task 9: Analysis Page

**Files:**
- Modify: `frontend/src/pages/Analysis.tsx`

- [ ] **Step 1: Rewrite Analysis page**

Replace the contents of `frontend/src/pages/Analysis.tsx`. Key changes:
- `TopAppBar` with title "Analysis"
- Tab bar: "By Symbol" | "By Date" | "Summary" with active state (border-b-2 primary)
- By Symbol tab:
  - Horizontal P&L bar chart (progress bars with `bg-secondary` for profit, `bg-tertiary-container` for loss)
  - Win probability card with mini bar chart
  - Detailed breakdown table with sortable columns
- By Date tab: daily P&L line chart + date summary table
- Summary tab: 10 metric stat cards in a grid (total P&L, win rate, profit factor, etc.)

Existing API calls (getAnalysisBySymbol, getAnalysisByDate, getAnalysisSummary) stay the same.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Analysis.tsx
git commit -m "feat: rewrite Analysis page with 3-tab design"
```

---

### Task 10: Statistics Page

**Files:**
- Modify: `frontend/src/pages/Statistics.tsx`

This is the largest page (currently 1405 lines). The rewrite should follow the same structure but with new styling.

- [ ] **Step 1: Rewrite Statistics page**

Replace the contents of `frontend/src/pages/Statistics.tsx`. Key changes:
- `TopAppBar` with title "Statistics"
- Horizontal scrollable tab bar: By Hour | By Day of Week | By Symbol | By Holding Time | P&L Distribution | Market Conditions | Risk & Reward
- Active tab: `text-primary border-b-2 border-primary`
- Each tab renders its content with the design system:
  - Bar charts use `bg-secondary` for positive, `bg-tertiary-container` for negative
  - Tables use `font-label`, `font-data`, `tabular-nums` classes
  - Market Conditions: 6 condition cards with compact tables (3 columns: state, win%, avg P&L)
  - P&L Distribution: histogram representation + descriptive stats sidebar
  - Statistical edge decay timeline at bottom of Market Conditions tab

The existing data fetching (getAdvancedStatistics) and all the data transformation logic stays the same. Only JSX/styling changes.

If the file exceeds ~800 lines, extract tab content into separate files under `frontend/src/pages/Statistics/` (e.g., `ByHour.tsx`, `MarketConditions.tsx`, `PnlDistribution.tsx`).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Statistics.tsx frontend/src/pages/Statistics/ 2>/dev/null
git commit -m "feat: rewrite Statistics page with 7 sub-tabs"
```

---

### Task 11: Charts Page

**Files:**
- Modify: `frontend/src/pages/Charts.tsx`
- Modify: `frontend/src/components/TradingViewWidget.tsx`
- Modify: `frontend/src/components/TradingChart.tsx`

- [ ] **Step 1: Restyle TradingViewWidget**

Update `frontend/src/components/TradingViewWidget.tsx` to use dark theme colors:
- Chart background: `#0f1419`
- Grid lines: `rgba(65, 71, 83, 0.15)`
- Up candle: `#1ea296` (secondary-container)
- Down candle: `#ff6762` (tertiary-container)
- Text color: `#8b919e` (outline)
- Crosshair: `#a7c8ff` (primary)

- [ ] **Step 2: Restyle TradingChart (Recharts)**

Update `frontend/src/components/TradingChart.tsx` to use dark theme colors for all Recharts components (Tooltip, XAxis, YAxis fills, stroke colors).

- [ ] **Step 3: Rewrite Charts page**

Replace the contents of `frontend/src/pages/Charts.tsx`. Key changes:
- `TopAppBar` with symbol search input and time range selector (1D/1W/1M/3M/6M/1Y/ALL toggle)
- Technical info ribbon: symbol name, current price (colored), volume
- Main chart area: TradingViewWidget with trade entry/exit markers
- SMA toggle buttons (SMA 50 blue, SMA 200 green)
- Bottom panel (h-64): recent executions table for selected symbol using `TradeTable`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Charts.tsx frontend/src/components/TradingViewWidget.tsx frontend/src/components/TradingChart.tsx
git commit -m "feat: rewrite Charts page with dark theme candlestick + trade overlay"
```

---

### Task 12: Position Detail Pages

**Files:**
- Modify: `frontend/src/pages/PositionDetail.tsx`
- Modify: `frontend/src/pages/DailyPositionDetail.tsx`

- [ ] **Step 1: Rewrite PositionDetail page**

Replace the contents of `frontend/src/pages/PositionDetail.tsx`. Key changes:
- `TopAppBar` with title "Position Detail"
- Header: symbol (4xl extrabold) + status badge (CLOSED gray / OPEN blue pill) + date range
- Summary cards row (7 cards): entry price, exit price, qty, P&L (secondary colored + border-l-2), P&L%, hold time, commission
- Left (lg:col-span-8): candlestick chart with entry/exit markers
- Right (lg:col-span-4): trades in position table (date, side badge, qty, price)
- Bottom: market conditions cards (6 cards with border-l-2 border-primary-container)
- Execution timeline: horizontal dots connected by dashed line

Existing data fetching (getPositionDetail, getTradesWithKline) stays the same.

- [ ] **Step 2: Rewrite DailyPositionDetail page**

Replace the contents of `frontend/src/pages/DailyPositionDetail.tsx` with the same design patterns as PositionDetail, adapted for daily grouping.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PositionDetail.tsx frontend/src/pages/DailyPositionDetail.tsx
git commit -m "feat: rewrite PositionDetail + DailyPositionDetail with new design"
```

---

### Task 13: Cleanup

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Remove lucide-react dependency**

```bash
cd frontend && npm uninstall lucide-react
```

- [ ] **Step 2: Verify no remaining lucide-react imports**

```bash
grep -r "lucide-react" frontend/src/
```

Expected: no results. If any remain, update those imports to use the `Icon` component.

- [ ] **Step 3: Run build to verify no TypeScript errors**

```bash
cd frontend && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A frontend/
git commit -m "chore: remove lucide-react, final cleanup"
```
