import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PnLCalendar } from '@/components/PnLCalendar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { getPositions, type Position } from '@/services/api'
import { formatCurrency, cn, getPnLColor } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

export function Calendar() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayTrades, setDayTrades] = useState<Position[]>([])
  const [loadingTrades, setLoadingTrades] = useState(false)

  const handleDayClick = async (date: string, _pnl: number) => {
    setSelectedDate(date)
    setLoadingTrades(true)

    try {
      const positions = await getPositions({ status: 'closed' })
      const filtered = positions.filter(p =>
        p.exit_time && p.exit_time.startsWith(date)
      )
      setDayTrades(filtered)
    } catch (error) {
      console.error('Failed to fetch day trades:', error)
    } finally {
      setLoadingTrades(false)
    }
  }

  const handleViewInTrades = () => {
    if (selectedDate && dayTrades.length > 0) {
      // Find the last trade of the day (by exit time)
      const sortedTrades = [...dayTrades].sort((a, b) => {
        const timeA = a.exit_time ? new Date(a.exit_time).getTime() : 0
        const timeB = b.exit_time ? new Date(b.exit_time).getTime() : 0
        return timeB - timeA
      })
      const lastTradeId = sortedTrades[0].id
      navigate(`/trades?date=${selectedDate}&highlight=${lastTradeId}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">P&L Calendar</h1>
        <p className="text-gray-500 mt-1">Visual overview of your daily trading performance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PnLCalendar onDayClick={handleDayClick} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? `Trades on ${selectedDate}` : 'Select a Day'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate && (
              <p className="text-gray-500 text-center py-8">
                Click on a trading day to view details
              </p>
            )}

            {selectedDate && loadingTrades && (
              <p className="text-gray-500 text-center py-8">Loading...</p>
            )}

            {selectedDate && !loadingTrades && dayTrades.length === 0 && (
              <p className="text-gray-500 text-center py-8">No closed positions on this day</p>
            )}

            {selectedDate && !loadingTrades && dayTrades.length > 0 && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">Day Total</p>
                      <p className={cn('text-2xl font-bold', getPnLColor(
                        dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
                      ))}>
                        {formatCurrency(dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0))}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewInTrades}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View in Trades
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {dayTrades.map(trade => (
                    <div
                      key={trade.id}
                      className="p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{trade.symbol}</p>
                          <p className="text-sm text-gray-500">
                            {trade.quantity} shares
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={cn('font-semibold', getPnLColor(trade.pnl || 0))}>
                            {formatCurrency(trade.pnl || 0)}
                          </p>
                          <p className={cn('text-sm', getPnLColor(trade.pnl_percent || 0))}>
                            {(trade.pnl_percent || 0) >= 0 ? '+' : ''}{(trade.pnl_percent || 0).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        <p>Entry: {formatCurrency(trade.entry_price)}</p>
                        <p>Exit: {formatCurrency(trade.exit_price || 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
