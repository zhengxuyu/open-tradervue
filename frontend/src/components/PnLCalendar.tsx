import { useState, useEffect } from 'react'
import { getCalendarDaily, getCalendarMonthly, type CalendarDay, type MonthSummary } from '@/services/api'
import { formatCurrency, cn, getPnLColor } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface PnLCalendarProps {
  onDayClick?: (date: string, pnl: number) => void
}

export function PnLCalendar({ onDayClick }: PnLCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([])
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [daily, monthly] = await Promise.all([
          getCalendarDaily(year, month),
          getCalendarMonthly(year)
        ])
        setCalendarData(daily)
        setMonthSummary(monthly.find(m => m.month === month) || null)
      } catch (error) {
        console.error('Failed to fetch calendar data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [year, month])

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1))
  }

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const getPnLForDay = (day: number): CalendarDay | undefined => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return calendarData.find(d => d.date === dateStr)
  }

  const renderDay = (day: number) => {
    const dayData = getPnLForDay(day)
    const hasTrades = dayData && dayData.trade_count > 0
    const pnl = dayData?.pnl || 0

    return (
      <button
        key={day}
        onClick={() => {
          if (hasTrades && onDayClick) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            onDayClick(dateStr, pnl)
          }
        }}
        className={cn(
          'aspect-square p-2 rounded-lg text-sm transition-colors',
          hasTrades
            ? cn(
                'cursor-pointer hover:ring-2 hover:ring-blue-400',
                pnl > 0 ? 'bg-green-100 hover:bg-green-200' :
                pnl < 0 ? 'bg-red-100 hover:bg-red-200' :
                'bg-gray-100 hover:bg-gray-200'
              )
            : 'text-gray-400'
        )}
      >
        <div className="font-medium">{day}</div>
        {hasTrades && (
          <div className={cn('text-xs font-semibold mt-1', getPnLColor(pnl))}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold text-gray-900">
          {MONTHS[month - 1]} {year}
        </h2>
        <Button variant="ghost" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {monthSummary && (
        <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Monthly P&L</p>
            <p className={cn('text-lg font-semibold', getPnLColor(monthSummary.total_pnl))}>
              {formatCurrency(monthSummary.total_pnl)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Trading Days</p>
            <p className="text-lg font-semibold text-gray-900">{monthSummary.trading_days}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Winning Days</p>
            <p className="text-lg font-semibold text-green-600">{monthSummary.winning_days}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Losing Days</p>
            <p className="text-lg font-semibold text-red-600">{monthSummary.losing_days}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => renderDay(i + 1))}
        </div>
      )}
    </div>
  )
}
