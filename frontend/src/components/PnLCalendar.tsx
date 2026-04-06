import { type CalendarDay } from '@/services/api'
import { formatCurrency, cn } from '@/lib/utils'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface PnLCalendarProps {
  year: number
  month: number
  calendarData: CalendarDay[]
  onDayClick?: (date: string) => void
  loading?: boolean
}

export function PnLCalendar({ year, month, calendarData, onDayClick, loading }: PnLCalendarProps) {
  // Monday-based: 0=Mon, 6=Sun
  const firstDayOfMonth = (new Date(year, month - 1, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()

  const getPnLForDay = (day: number): CalendarDay | undefined => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return calendarData.find(d => d.date === dateStr)
  }

  // Find max absolute PnL for opacity scaling
  const maxPnL = calendarData.reduce((max, d) => Math.max(max, Math.abs(d.pnl)), 0) || 1

  const getOpacity = (pnl: number): number => {
    const ratio = Math.abs(pnl) / maxPnL
    return Math.max(0.08, Math.min(0.6, ratio * 0.6))
  }

  if (loading) {
    return (
      <div className="grid grid-cols-7 gap-px bg-outline-variant/10 border border-outline-variant/20 overflow-hidden rounded-xl">
        {WEEKDAYS.map(day => (
          <div key={day} className="bg-surface-container-low py-3 text-center text-[10px] font-label font-bold text-outline uppercase tracking-[0.2em]">
            {day}
          </div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-32 bg-surface-container animate-pulse" />
        ))}
      </div>
    )
  }

  const renderDay = (day: number) => {
    const dayData = getPnLForDay(day)
    const hasTrades = dayData && dayData.trade_count > 0
    const pnl = dayData?.pnl || 0
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    const isProfit = pnl > 0
    const isLoss = pnl < 0

    return (
      <button
        key={day}
        onClick={() => onDayClick?.(dateStr)}
        className={cn(
          'h-32 p-3 flex flex-col justify-between cursor-pointer hover:brightness-110 transition-all text-left',
          hasTrades
            ? cn(
                isProfit && 'border-l-2 border-secondary',
                isLoss && 'border-l-2 border-tertiary',
              )
            : 'bg-surface-container opacity-50'
        )}
        style={hasTrades ? {
          backgroundColor: isProfit
            ? `oklch(var(--color-secondary-container) / ${getOpacity(pnl)})`
            : isLoss
            ? `oklch(var(--color-tertiary-container) / ${getOpacity(pnl)})`
            : undefined,
        } : undefined}
      >
        <div className="flex justify-between items-start">
          <span className="font-label text-xs font-bold text-on-surface-variant">{day}</span>
          {hasTrades && (
            <span className="text-[10px] font-label text-outline">
              {dayData.trade_count} {dayData.trade_count === 1 ? 'trade' : 'trades'}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className={cn(
            'font-label text-lg font-extrabold tabular-nums',
            hasTrades
              ? isProfit ? 'text-secondary' : isLoss ? 'text-tertiary' : 'text-outline'
              : 'text-outline-variant'
          )}>
            {hasTrades ? formatCurrency(pnl) : '$0.00'}
          </span>
        </div>
      </button>
    )
  }

  return (
    <div className="grid grid-cols-7 gap-px bg-outline-variant/10 border border-outline-variant/20 overflow-hidden rounded-xl">
      {WEEKDAYS.map(day => (
        <div key={day} className="bg-surface-container-low py-3 text-center text-[10px] font-label font-bold text-outline uppercase tracking-[0.2em]">
          {day}
        </div>
      ))}
      {Array.from({ length: firstDayOfMonth }).map((_, i) => (
        <div key={`empty-${i}`} className="h-32 bg-surface-container opacity-30" />
      ))}
      {Array.from({ length: daysInMonth }).map((_, i) => renderDay(i + 1))}
      {/* Fill remaining cells to complete the grid */}
      {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_, i) => (
        <div key={`pad-${i}`} className="h-32 bg-surface-container opacity-30" />
      ))}
    </div>
  )
}
