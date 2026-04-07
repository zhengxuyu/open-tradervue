import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PnLCalendar } from '@/components/PnLCalendar'
import { TopAppBar } from '@/components/TopAppBar'
import { Icon } from '@/components/Icon'
import {
  getCalendarDaily,
  getCalendarMonthly,
  getCalendarYearly,
  type CalendarDay,
  type MonthSummary,
  type YearSummary,
} from '@/services/api'
import { formatCurrency, cn } from '@/lib/utils'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function Calendar() {
  const navigate = useNavigate()
  const [view, setView] = useState<'monthly' | 'yearly'>('monthly')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([])
  const [monthSummaries, setMonthSummaries] = useState<MonthSummary[]>([])
  const [, setYearSummaries] = useState<YearSummary[]>([])
  const [yearlyDailyData, setYearlyDailyData] = useState<Record<number, CalendarDay[]>>({})
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  // Fetch monthly view data
  useEffect(() => {
    if (view !== 'monthly') return
    const fetchData = async () => {
      setLoading(true)
      try {
        const [daily, monthly] = await Promise.all([
          getCalendarDaily(year, month),
          getCalendarMonthly(year),
        ])
        setCalendarData(daily)
        setMonthSummaries(monthly)
      } catch (error) {
        console.error('Failed to fetch calendar data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [year, month, view])

  // Fetch yearly view data
  useEffect(() => {
    if (view !== 'yearly') return
    const fetchData = async () => {
      setLoading(true)
      try {
        const [yearly, monthly] = await Promise.all([
          getCalendarYearly(),
          getCalendarMonthly(year),
        ])
        setYearSummaries(yearly)
        setMonthSummaries(monthly)

        // Fetch daily data for all 12 months for the heatmap
        const dailyPromises = Array.from({ length: 12 }, (_, i) =>
          getCalendarDaily(year, i + 1).catch(() => [] as CalendarDay[])
        )
        const allDaily = await Promise.all(dailyPromises)
        const byMonth: Record<number, CalendarDay[]> = {}
        allDaily.forEach((data, i) => { byMonth[i + 1] = data })
        setYearlyDailyData(byMonth)
      } catch (error) {
        console.error('Failed to fetch yearly data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [year, view])

  const currentMonthSummary = monthSummaries.find(m => m.month === month)

  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month, 1))
  const prevYear = () => setCurrentDate(new Date(year - 1, month - 1, 1))
  const nextYear = () => setCurrentDate(new Date(year + 1, month - 1, 1))

  const handleDayClick = (date: string) => {
    navigate(`/journal?date=${date}`)
  }

  return (
    <div className="flex flex-col h-full">
      <TopAppBar
        title="Calendar"
        actions={
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center bg-surface-container rounded-lg p-0.5">
              <button
                onClick={() => setView('monthly')}
                className={cn(
                  'px-3 py-1.5 text-xs font-label font-bold uppercase tracking-wider rounded-md transition-all',
                  view === 'monthly'
                    ? 'bg-primary text-on-primary'
                    : 'text-outline hover:text-on-surface'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setView('yearly')}
                className={cn(
                  'px-3 py-1.5 text-xs font-label font-bold uppercase tracking-wider rounded-md transition-all',
                  view === 'yearly'
                    ? 'bg-primary text-on-primary'
                    : 'text-outline hover:text-on-surface'
                )}
              >
                Yearly
              </button>
            </div>

            {/* Navigation arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={view === 'monthly' ? prevMonth : prevYear}
                className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-outline hover:text-on-surface"
              >
                <Icon name="chevron_left" className="text-lg" />
              </button>
              <span className="font-label text-sm font-bold text-on-surface min-w-[140px] text-center">
                {view === 'monthly' ? `${MONTHS[month - 1]} ${year}` : `${year}`}
              </span>
              <button
                onClick={view === 'monthly' ? nextMonth : nextYear}
                className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-outline hover:text-on-surface"
              >
                <Icon name="chevron_right" className="text-lg" />
              </button>
            </div>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {view === 'monthly' ? (
          <>
            <PnLCalendar
              year={year}
              month={month}
              calendarData={calendarData}
              onDayClick={handleDayClick}
              loading={loading}
            />

            {/* Bottom summary row */}
            {currentMonthSummary && (
              <div className="grid grid-cols-5 gap-4">
                <SummaryCard
                  label="Monthly Total"
                  value={formatCurrency(currentMonthSummary.total_pnl)}
                  valueColor={currentMonthSummary.total_pnl >= 0 ? 'text-secondary' : 'text-tertiary'}
                />
                <SummaryCard
                  label="Trading Days"
                  value={String(currentMonthSummary.trading_days)}
                  valueColor="text-on-surface"
                />
                <SummaryCard
                  label="Avg Daily P&L"
                  value={currentMonthSummary.trading_days > 0
                    ? formatCurrency(currentMonthSummary.total_pnl / currentMonthSummary.trading_days)
                    : '$0.00'}
                  valueColor={currentMonthSummary.total_pnl >= 0 ? 'text-secondary' : 'text-tertiary'}
                />
                <SummaryCard
                  label="Best Day"
                  value={formatCurrency(currentMonthSummary.best_day)}
                  valueColor="text-secondary"
                />
                <SummaryCard
                  label="Worst Day"
                  value={formatCurrency(currentMonthSummary.worst_day)}
                  valueColor="text-tertiary"
                />
              </div>
            )}
          </>
        ) : (
          /* Yearly view: 4x3 grid of mini-month tiles */
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
              const summary = monthSummaries.find(s => s.month === m)
              const dailyData = yearlyDailyData[m] || []
              return (
                <MiniMonth
                  key={m}
                  year={year}
                  month={m}
                  label={MONTHS_SHORT[m - 1]}
                  totalPnl={summary?.total_pnl ?? 0}
                  tradingDays={summary?.trading_days ?? 0}
                  dailyData={dailyData}
                  onClick={() => {
                    setCurrentDate(new Date(year, m - 1, 1))
                    setView('monthly')
                  }}
                  loading={loading}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
      <p className="text-[10px] font-label font-bold text-outline uppercase tracking-wider mb-2">{label}</p>
      <p className={cn('font-label text-xl font-extrabold tabular-nums', valueColor)}>{value}</p>
    </div>
  )
}

function MiniMonth({
  year,
  month,
  label,
  totalPnl,
  tradingDays,
  dailyData,
  onClick,
  loading,
}: {
  year: number
  month: number
  label: string
  totalPnl: number
  tradingDays: number
  dailyData: CalendarDay[]
  onClick: () => void
  loading: boolean
}) {
  const firstDay = (new Date(year, month - 1, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  const maxPnL = dailyData.reduce((max, d) => Math.max(max, Math.abs(d.pnl)), 0) || 1

  const getSquareColor = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayData = dailyData.find(d => d.date === dateStr)
    if (!dayData || dayData.trade_count === 0) return 'bg-surface-container'
    const ratio = Math.min(1, Math.abs(dayData.pnl) / maxPnL)
    if (dayData.pnl > 0) {
      return ratio > 0.5 ? 'bg-secondary' : 'bg-secondary/50'
    }
    return ratio > 0.5 ? 'bg-tertiary' : 'bg-tertiary/50'
  }

  return (
    <button
      onClick={onClick}
      className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 hover:border-outline-variant/30 transition-all text-left"
    >
      <div className="flex justify-between items-baseline mb-2">
        <span className="font-label text-xs font-bold text-on-surface">{label}</span>
        <span className="text-[10px] font-label text-outline">{tradingDays}d</span>
      </div>
      <p className={cn(
        'font-label text-sm font-extrabold tabular-nums mb-3',
        totalPnl > 0 ? 'text-secondary' : totalPnl < 0 ? 'text-tertiary' : 'text-outline'
      )}>
        {formatCurrency(totalPnl)}
      </p>

      {/* Mini heatmap grid */}
      {loading ? (
        <div className="h-[60px] bg-surface-container animate-pulse rounded" />
      ) : (
        <div className="grid grid-cols-7 gap-[2px]">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} className="aspect-square rounded-[2px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => (
            <div
              key={i}
              className={cn('aspect-square rounded-[2px]', getSquareColor(i + 1))}
            />
          ))}
        </div>
      )}
    </button>
  )
}
