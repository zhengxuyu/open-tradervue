import { useEffect, useState } from 'react'
import { TopAppBar } from '@/components/TopAppBar'
import { Icon } from '@/components/Icon'
import {
  getAnalysisSummary,
  getAnalysisBySymbol,
  getAnalysisByDate,
  getAdvancedStatistics,
  type AnalysisSummary,
  type SymbolAnalysis,
  type DateAnalysis,
  type AdvancedStatistics,
} from '@/services/api'
import { formatCurrency, cn } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

type Tab = 'symbol' | 'date' | 'summary'

export function Analysis() {
  const [summary, setSummary] = useState<AnalysisSummary | null>(null)
  const [advanced, setAdvanced] = useState<AdvancedStatistics | null>(null)
  const [bySymbol, setBySymbol] = useState<SymbolAnalysis[]>([])
  const [byDate, setByDate] = useState<DateAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('symbol')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, symbolData, dateData, advancedData] = await Promise.all([
          getAnalysisSummary(),
          getAnalysisBySymbol(),
          getAnalysisByDate(),
          getAdvancedStatistics(),
        ])
        setSummary(summaryData)
        setBySymbol(symbolData)
        setByDate(dateData)
        setAdvanced(advancedData)
      } catch (error) {
        console.error('Failed to fetch analysis data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-outline text-sm">Loading analysis...</p>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'symbol', label: 'By Symbol' },
    { key: 'date', label: 'By Date' },
    { key: 'summary', label: 'Summary' },
  ]

  const maxPnl = bySymbol.length > 0
    ? Math.max(...bySymbol.map(s => Math.abs(s.total_pnl)))
    : 1

  const totalWins = summary ? summary.win_count : 0
  const totalLosses = summary ? summary.loss_count : 0
  const totalTrades = summary ? summary.total_trades : 0
  const winProbability = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0

  // Compute advanced metrics for summary tab
  const profitFactor = summary?.profit_factor ?? 0
  const avgWin = summary?.avg_win ?? 0
  const avgLoss = summary?.avg_loss ?? 0
  const avgWinLoss = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0
  const maxDrawdown = summary?.max_drawdown ?? 0
  const totalPnl = summary?.total_pnl ?? 0
  const winRate = summary?.win_rate ?? 0
  const totalCommission = advanced?.detailed_summary?.total_commissions ?? 0
  const totalVolume = advanced?.detailed_summary?.avg_daily_volume
    ? advanced.detailed_summary.avg_daily_volume * (advanced.detailed_summary.trading_days || 1)
    : 0

  // Expectancy = (win_rate * avg_win) - (loss_rate * |avg_loss|)
  const expectancy = (winRate / 100) * avgWin + (1 - winRate / 100) * (summary?.avg_loss ?? 0)

  // Sharpe-like: avg_pnl / std_dev
  const sharpeRatio = advanced?.detailed_summary?.pnl_std_dev
    ? (advanced.detailed_summary.avg_trade_pnl / advanced.detailed_summary.pnl_std_dev)
    : 0

  // Recovery factor: total_pnl / |max_drawdown|
  const recoveryFactor = maxDrawdown !== 0 ? totalPnl / Math.abs(maxDrawdown) : 0

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopAppBar title="Analysis" />

      {/* Tab bar */}
      <div className="flex gap-6 px-6 pt-4 border-b border-outline-variant/15">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'pb-3 border-b-2 text-sm transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-outline hover:text-on-surface font-medium'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ====== BY SYMBOL TAB ====== */}
        {activeTab === 'symbol' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: P&L bar chart */}
              <div className="lg:col-span-8 bg-surface-container-low rounded-xl p-5">
                <h3 className="text-xs font-label uppercase tracking-widest text-outline mb-4">
                  P&L by Symbol
                </h3>
                {bySymbol.length > 0 ? (
                  <div className="space-y-3">
                    {bySymbol.map(sym => (
                      <div key={sym.symbol} className="flex items-center gap-3">
                        <span className="w-16 shrink-0 font-label font-bold text-sm text-on-surface truncate">
                          {sym.symbol}
                        </span>
                        <div className="flex-1">
                          <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                sym.total_pnl >= 0 ? 'bg-secondary' : 'bg-tertiary-container'
                              )}
                              style={{
                                width: `${(Math.abs(sym.total_pnl) / maxPnl) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span
                          className={cn(
                            'w-24 text-right text-sm font-label font-semibold',
                            sym.total_pnl >= 0 ? 'text-secondary' : 'text-tertiary-container'
                          )}
                        >
                          {formatCurrency(sym.total_pnl)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-outline text-sm text-center py-8">No symbol data</p>
                )}
              </div>

              {/* Right: Win probability card */}
              <div className="lg:col-span-4 bg-primary-container/10 rounded-xl border border-primary/20 p-5 flex flex-col justify-center">
                <h3 className="text-xs font-label uppercase tracking-widest text-outline mb-4">
                  Win Probability
                </h3>
                <div className="text-center space-y-3">
                  <p className="text-4xl font-bold font-label text-primary">
                    {winProbability.toFixed(1)}%
                  </p>
                  <div className="flex justify-center gap-6 text-sm">
                    <div>
                      <p className="text-outline text-[10px] uppercase tracking-wider">Wins</p>
                      <p className="font-label font-bold text-secondary">{totalWins}</p>
                    </div>
                    <div>
                      <p className="text-outline text-[10px] uppercase tracking-wider">Losses</p>
                      <p className="font-label font-bold text-tertiary-container">{totalLosses}</p>
                    </div>
                    <div>
                      <p className="text-outline text-[10px] uppercase tracking-wider">Total</p>
                      <p className="font-label font-bold text-on-surface">{totalTrades}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed symbol table */}
            {advanced && advanced.by_symbol.length > 0 && (
              <div className="bg-surface-container-low rounded-xl overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-outline-variant/10">
                      <th className="px-5 py-3 text-left text-xs font-label uppercase tracking-widest text-outline">Symbol</th>
                      <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Trades</th>
                      <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Win Rate</th>
                      <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Total P&L</th>
                      <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Avg P&L</th>
                      <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Profit Factor</th>
                      <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Best Trade</th>
                      <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Worst Trade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advanced.by_symbol.map(sym => (
                      <tr key={sym.symbol} className="border-b border-outline-variant/5 hover:bg-surface-container/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'w-1 h-5 rounded-full',
                                sym.total_pnl >= 0 ? 'bg-secondary' : 'bg-tertiary-container'
                              )}
                            />
                            <span className="font-label font-bold text-on-surface">{sym.symbol}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-on-surface-variant">{sym.trade_count}</td>
                        <td className={cn(
                          'px-5 py-3 text-right text-sm font-medium',
                          sym.win_rate > 50 ? 'text-secondary' : sym.win_rate < 50 ? 'text-tertiary' : 'text-on-surface-variant'
                        )}>
                          {sym.win_rate.toFixed(1)}%
                        </td>
                        <td className={cn(
                          'px-5 py-3 text-right text-sm font-semibold',
                          sym.total_pnl >= 0 ? 'text-secondary' : 'text-tertiary-container'
                        )}>
                          {formatCurrency(sym.total_pnl)}
                        </td>
                        <td className={cn(
                          'px-5 py-3 text-right text-sm',
                          sym.avg_pnl >= 0 ? 'text-secondary' : 'text-tertiary-container'
                        )}>
                          {formatCurrency(sym.avg_pnl)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-on-surface-variant">
                          {sym.profit_factor.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-secondary">
                          {formatCurrency(sym.best_trade)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-tertiary-container">
                          {formatCurrency(sym.worst_trade)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Fallback table from basic bySymbol data if no advanced */}
            {(!advanced || advanced.by_symbol.length === 0) && bySymbol.length > 0 && (
              <div className="bg-surface-container-low rounded-xl overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-outline-variant/10">
                      <th className="px-5 py-3 text-left text-xs font-label uppercase tracking-widest text-outline">Symbol</th>
                      <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Trades</th>
                      <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Win Rate</th>
                      <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Total P&L</th>
                      <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Avg P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySymbol.map(sym => (
                      <tr key={sym.symbol} className="border-b border-outline-variant/5 hover:bg-surface-container/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'w-1 h-5 rounded-full',
                                sym.total_pnl >= 0 ? 'bg-secondary' : 'bg-tertiary-container'
                              )}
                            />
                            <span className="font-label font-bold text-on-surface">{sym.symbol}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-on-surface-variant">{sym.total_trades}</td>
                        <td className={cn(
                          'px-5 py-3 text-right text-sm font-medium',
                          sym.win_rate > 50 ? 'text-secondary' : sym.win_rate < 50 ? 'text-tertiary' : 'text-on-surface-variant'
                        )}>
                          {sym.win_rate.toFixed(1)}%
                        </td>
                        <td className={cn(
                          'px-5 py-3 text-right text-sm font-semibold',
                          sym.total_pnl >= 0 ? 'text-secondary' : 'text-tertiary-container'
                        )}>
                          {formatCurrency(sym.total_pnl)}
                        </td>
                        <td className={cn(
                          'px-5 py-3 text-right text-sm',
                          sym.avg_pnl >= 0 ? 'text-secondary' : 'text-tertiary-container'
                        )}>
                          {formatCurrency(sym.avg_pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ====== BY DATE TAB ====== */}
        {activeTab === 'date' && (
          <>
            {byDate.length > 0 ? (
              <>
                {/* Date P&L chart */}
                <div className="bg-surface-container-low rounded-xl p-5">
                  <h3 className="text-xs font-label uppercase tracking-widest text-outline mb-4">
                    Daily P&L
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...byDate].reverse()}>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: 'var(--color-outline)' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'var(--color-outline)' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-surface-container)',
                            border: '1px solid var(--color-outline-variant)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number) => [formatCurrency(value), 'P&L']}
                        />
                        <Bar dataKey="total_pnl" radius={[4, 4, 0, 0]}>
                          {[...byDate].reverse().map((entry, index) => (
                            <Cell
                              key={index}
                              fill={entry.total_pnl >= 0
                                ? 'var(--color-secondary)'
                                : 'var(--color-tertiary-container)'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Date table */}
                <div className="bg-surface-container-low rounded-xl overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-outline-variant/10">
                        <th className="px-5 py-3 text-left text-xs font-label uppercase tracking-widest text-outline">Date</th>
                        <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">P&L</th>
                        <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Trades</th>
                        <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Wins</th>
                        <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Losses</th>
                        <th className="px-5 py-3 text-right text-xs font-label uppercase tracking-widest text-outline">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byDate.slice().reverse().map(day => {
                        const dayWinRate = day.trade_count > 0
                          ? (day.win_count / day.trade_count * 100).toFixed(1)
                          : '0.0'
                        return (
                          <tr key={day.date} className="border-b border-outline-variant/5 hover:bg-surface-container/50">
                            <td className="px-5 py-3 text-sm font-label text-on-surface">{day.date}</td>
                            <td className={cn(
                              'px-5 py-3 text-right text-sm font-semibold',
                              day.total_pnl >= 0 ? 'text-secondary' : 'text-tertiary-container'
                            )}>
                              {formatCurrency(day.total_pnl)}
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-on-surface-variant">{day.trade_count}</td>
                            <td className="px-5 py-3 text-right text-sm text-secondary">{day.win_count}</td>
                            <td className="px-5 py-3 text-right text-sm text-tertiary-container">{day.loss_count}</td>
                            <td className={cn(
                              'px-5 py-3 text-right text-sm font-medium',
                              parseFloat(dayWinRate) > 50 ? 'text-secondary' : parseFloat(dayWinRate) < 50 ? 'text-tertiary' : 'text-on-surface-variant'
                            )}>
                              {dayWinRate}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-outline text-sm text-center py-12">No daily data available</p>
            )}
          </>
        )}

        {/* ====== SUMMARY TAB ====== */}
        {activeTab === 'summary' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Total P&L */}
              <div className="bg-surface-container rounded-lg p-5 border-l-4 border-secondary">
                <p className="text-[10px] font-label text-outline uppercase tracking-wider">Total P&L</p>
                <p className={cn(
                  'text-xl font-bold font-label mt-1',
                  totalPnl >= 0 ? 'text-secondary' : 'text-tertiary-container'
                )}>
                  {formatCurrency(totalPnl)}
                </p>
              </div>

              {/* Win Rate */}
              <div className="bg-surface-container rounded-lg p-5">
                <p className="text-[10px] font-label text-outline uppercase tracking-wider">Win Rate</p>
                <p className="text-xl font-bold font-label text-on-surface mt-1">
                  {winRate.toFixed(1)}%
                </p>
              </div>

              {/* Profit Factor */}
              <div className="bg-surface-container rounded-lg p-5">
                <p className="text-[10px] font-label text-outline uppercase tracking-wider">Profit Factor</p>
                <p className="text-xl font-bold font-label text-on-surface mt-1">
                  {profitFactor.toFixed(2)}
                </p>
              </div>

              {/* Avg Win/Loss */}
              <div className="bg-surface-container rounded-lg p-5">
                <p className="text-[10px] font-label text-outline uppercase tracking-wider">Avg Win/Loss</p>
                <p className="text-xl font-bold font-label text-on-surface mt-1">
                  {avgWinLoss.toFixed(2)}
                </p>
              </div>

              {/* Max Drawdown */}
              <div className="bg-surface-container rounded-lg p-5 border-l-4 border-tertiary-container">
                <p className="text-[10px] font-label text-outline uppercase tracking-wider">Max Drawdown</p>
                <p className="text-xl font-bold font-label text-tertiary-container mt-1">
                  {formatCurrency(maxDrawdown)}
                </p>
              </div>

              {/* Sharpe Ratio */}
              <div className="bg-surface-container rounded-lg p-5">
                <p className="text-[10px] font-label text-outline uppercase tracking-wider">Sharpe Ratio</p>
                <p className="text-xl font-bold font-label text-on-surface mt-1">
                  {sharpeRatio.toFixed(2)}
                </p>
              </div>

              {/* Expectancy */}
              <div className="bg-surface-container rounded-lg p-5">
                <p className="text-[10px] font-label text-outline uppercase tracking-wider">Expectancy</p>
                <p className={cn(
                  'text-xl font-bold font-label mt-1',
                  expectancy >= 0 ? 'text-secondary' : 'text-tertiary-container'
                )}>
                  {formatCurrency(expectancy)}
                </p>
              </div>

              {/* Recovery Factor */}
              <div className="bg-surface-container rounded-lg p-5">
                <p className="text-[10px] font-label text-outline uppercase tracking-wider">Recovery Factor</p>
                <p className="text-xl font-bold font-label text-on-surface mt-1">
                  {recoveryFactor.toFixed(2)}
                </p>
              </div>

              {/* Commission */}
              <div className="bg-surface-container rounded-lg p-5">
                <p className="text-[10px] font-label text-outline uppercase tracking-wider">Commission</p>
                <p className="text-xl font-bold font-label text-on-surface mt-1">
                  {formatCurrency(totalCommission)}
                </p>
              </div>

              {/* Total Volume */}
              <div className="bg-surface-container rounded-lg p-5">
                <p className="text-[10px] font-label text-outline uppercase tracking-wider">Total Volume</p>
                <p className="text-xl font-bold font-label text-on-surface mt-1">
                  {totalVolume.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Win/Loss breakdown */}
            {summary && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface-container-low rounded-xl p-5">
                  <h3 className="text-xs font-label uppercase tracking-widest text-outline mb-4">
                    Win / Loss Breakdown
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-outline">Total Trades</span>
                      <span className="text-sm font-label font-bold text-on-surface">{summary.total_trades}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-outline">Winning Trades</span>
                      <span className="text-sm font-label font-bold text-secondary">{summary.win_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-outline">Losing Trades</span>
                      <span className="text-sm font-label font-bold text-tertiary-container">{summary.loss_count}</span>
                    </div>
                    <div className="h-px bg-outline-variant/10 my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-outline">Average Win</span>
                      <span className="text-sm font-label font-bold text-secondary">{formatCurrency(summary.avg_win)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-outline">Average Loss</span>
                      <span className="text-sm font-label font-bold text-tertiary-container">{formatCurrency(summary.avg_loss)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-low rounded-xl p-5">
                  <h3 className="text-xs font-label uppercase tracking-widest text-outline mb-4">
                    Extremes
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-outline">Best Trade</span>
                      <span className="text-sm font-label font-bold text-secondary">{formatCurrency(summary.best_trade)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-outline">Worst Trade</span>
                      <span className="text-sm font-label font-bold text-tertiary-container">{formatCurrency(summary.worst_trade)}</span>
                    </div>
                    <div className="h-px bg-outline-variant/10 my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-outline">Net P&L</span>
                      <span className={cn(
                        'text-sm font-label font-bold',
                        summary.net_pnl >= 0 ? 'text-secondary' : 'text-tertiary-container'
                      )}>
                        {formatCurrency(summary.net_pnl)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-outline">Total Commission</span>
                      <span className="text-sm font-label font-bold text-on-surface">{formatCurrency(summary.total_commission)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
