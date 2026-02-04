import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { StatCard } from '@/components/StatCard'
import {
  getAnalysisSummary,
  getAnalysisBySymbol,
  getAnalysisByDate,
  type AnalysisSummary,
  type SymbolAnalysis,
  type DateAnalysis
} from '@/services/api'
import { formatCurrency, cn, getPnLColor } from '@/lib/utils'
import { TrendingUp, TrendingDown, Target, Activity, AlertTriangle } from 'lucide-react'

export function Analysis() {
  const [summary, setSummary] = useState<AnalysisSummary | null>(null)
  const [bySymbol, setBySymbol] = useState<SymbolAnalysis[]>([])
  const [byDate, setByDate] = useState<DateAnalysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, symbolData, dateData] = await Promise.all([
          getAnalysisSummary(),
          getAnalysisBySymbol(),
          getAnalysisByDate()
        ])
        setSummary(summaryData)
        setBySymbol(symbolData)
        setByDate(dateData)
      } catch (error) {
        console.error('Failed to fetch analysis data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading analysis...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analysis</h1>
        <p className="text-gray-500 mt-1">Detailed breakdown of your trading performance</p>
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
          title="Profit Factor"
          value={summary?.profit_factor?.toFixed(2) || '0.00'}
          icon={Activity}
        />
        <StatCard
          title="Max Drawdown"
          value={summary?.max_drawdown || 0}
          icon={AlertTriangle}
          isPnL
          isCurrency
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Win/Loss Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Total Trades</span>
                  <span className="font-semibold">{summary.total_trades}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Winning Trades</span>
                  <span className="font-semibold text-green-600">{summary.win_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Losing Trades</span>
                  <span className="font-semibold text-red-600">{summary.loss_count}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Average Win</span>
                  <span className="font-semibold text-green-600">{formatCurrency(summary.avg_win)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Average Loss</span>
                  <span className="font-semibold text-red-600">{formatCurrency(summary.avg_loss)}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Best Trade</span>
                  <span className="font-semibold text-green-600">{formatCurrency(summary.best_trade)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Worst Trade</span>
                  <span className="font-semibold text-red-600">{formatCurrency(summary.worst_trade)}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance by Symbol</CardTitle>
          </CardHeader>
          <CardContent>
            {bySymbol.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {bySymbol.map(sym => (
                  <div
                    key={sym.symbol}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{sym.symbol}</p>
                      <p className="text-sm text-gray-500">
                        {sym.total_trades} trades | {sym.win_rate.toFixed(1)}% win rate
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('font-semibold', getPnLColor(sym.total_pnl))}>
                        {formatCurrency(sym.total_pnl)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Avg: {formatCurrency(sym.avg_pnl)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No symbol data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {byDate.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">P&L</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trades</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wins</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Losses</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {byDate.slice().reverse().map(day => {
                    const winRate = day.trade_count > 0
                      ? (day.win_count / day.trade_count * 100).toFixed(1)
                      : '0.0'
                    return (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {day.date}
                        </td>
                        <td className={cn(
                          'px-6 py-4 whitespace-nowrap text-sm text-right font-medium',
                          getPnLColor(day.total_pnl)
                        )}>
                          {formatCurrency(day.total_pnl)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {day.trade_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                          {day.win_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                          {day.loss_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {winRate}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No daily data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
