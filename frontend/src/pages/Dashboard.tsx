import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { StatCard } from '@/components/StatCard'
import { TradeTable } from '@/components/TradeTable'
import { getAnalysisSummary, getTrades, getPositions, type AnalysisSummary, type Trade, type Position } from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react'

export function Dashboard() {
  const [summary, setSummary] = useState<AnalysisSummary | null>(null)
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [openPositions, setOpenPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, tradesData, positionsData] = await Promise.all([
          getAnalysisSummary(),
          getTrades({ limit: 10 }),
          getPositions({ status: 'open' })
        ])
        setSummary(summaryData)
        setRecentTrades(tradesData)
        setOpenPositions(positionsData)
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
      <div className="text-center py-12 text-gray-500">Loading dashboard...</div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your trading performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total P&L"
          value={summary?.total_pnl || 0}
          icon={summary?.total_pnl && summary.total_pnl >= 0 ? TrendingUp : TrendingDown}
          isPnL
          isCurrency
        />
        <StatCard
          title="Win Rate"
          value={summary?.win_rate || 0}
          icon={Target}
          isPercent
        />
        <StatCard
          title="Total Trades"
          value={summary?.total_trades || 0}
          icon={Activity}
        />
        <StatCard
          title="Profit Factor"
          value={summary?.profit_factor?.toFixed(2) || '0.00'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Winning Trades</p>
                  <p className="text-xl font-semibold text-green-600">{summary.win_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Losing Trades</p>
                  <p className="text-xl font-semibold text-red-600">{summary.loss_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Win</p>
                  <p className="text-xl font-semibold text-green-600">{formatCurrency(summary.avg_win)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Loss</p>
                  <p className="text-xl font-semibold text-red-600">{formatCurrency(summary.avg_loss)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Best Trade</p>
                  <p className="text-xl font-semibold text-green-600">{formatCurrency(summary.best_trade)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Worst Trade</p>
                  <p className="text-xl font-semibold text-red-600">{formatCurrency(summary.worst_trade)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Max Drawdown</p>
                  <p className="text-xl font-semibold text-red-600">{formatCurrency(summary.max_drawdown)}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            {openPositions.length > 0 ? (
              <div className="space-y-3">
                {openPositions.map(pos => (
                  <div key={pos.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{pos.symbol}</p>
                      <p className="text-sm text-gray-500">{pos.quantity} shares @ {formatCurrency(pos.entry_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No open positions</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TradeTable trades={recentTrades} />
        </CardContent>
      </Card>
    </div>
  )
}
