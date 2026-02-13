import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import {
  getAdvancedStatistics,
  fetchMarketData,
  type AdvancedStatistics
} from '@/services/api'
import { formatCurrency, cn, getPnLColor } from '@/lib/utils'
import {
  BarChart3, Clock, Calendar, Target, Activity,
  Lightbulb, AlertTriangle, Flame, Award, XCircle, TrendingUp, DollarSign
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ComposedChart, Area
} from 'recharts'

type TabType = 'overview' | 'charts' | 'symbols' | 'time' | 'market' | 'entry' | 'insights'

export function Statistics() {
  const [stats, setStats] = useState<AdvancedStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [fetchingMarketData, setFetchingMarketData] = useState(false)
  const [marketDataMessage, setMarketDataMessage] = useState<string | null>(null)
  const [baseRisk, setBaseRisk] = useState(5)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (dateRange.start) params.start_date = dateRange.start
      if (dateRange.end) params.end_date = dateRange.end

      const data = await getAdvancedStatistics(params)
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleFilter = () => {
    fetchStats()
  }

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)} minutes`
    if (mins < 1440) return `${Math.round(mins / 60)} hours`
    return `${Math.round(mins / 1440)} days`
  }

  const renderOverview = () => {
    if (!stats) return null
    const { detailed_summary: d, streak_data } = stats

    return (
      <div className="space-y-6">
        {/* Tradervue-style Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Trading Summary ({d.trading_days} Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <tbody className="divide-y divide-gray-100">
                  {/* Row 1: P&L Overview */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">Total Gain/Loss</td>
                    <td className={cn('px-4 py-3 text-sm font-semibold', getPnLColor(d.total_gain_loss))}>
                      {formatCurrency(d.total_gain_loss)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">Largest Gain</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">{formatCurrency(d.largest_gain)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">Largest Loss</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">{formatCurrency(d.largest_loss)}</td>
                  </tr>
                  {/* Row 2: Daily Averages */}
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-500">Average Daily Gain/Loss</td>
                    <td className={cn('px-4 py-3 text-sm font-semibold', getPnLColor(d.avg_daily_pnl))}>
                      {formatCurrency(d.avg_daily_pnl)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">Average Daily Volume</td>
                    <td className="px-4 py-3 text-sm font-semibold">{Math.round(d.avg_daily_volume).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">Average Per-share Gain/Loss</td>
                    <td className={cn('px-4 py-3 text-sm font-semibold', getPnLColor(d.avg_per_share_pnl))}>
                      {formatCurrency(d.avg_per_share_pnl)}
                    </td>
                  </tr>
                  {/* Row 3: Trade Averages */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">Average Trade Gain/Loss</td>
                    <td className={cn('px-4 py-3 text-sm font-semibold', getPnLColor(d.avg_trade_pnl))}>
                      {formatCurrency(d.avg_trade_pnl)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">Average Winning Trade</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">{formatCurrency(d.avg_winning_trade)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">Average Losing Trade</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">{formatCurrency(d.avg_losing_trade)}</td>
                  </tr>
                  {/* Row 4: Trade Counts */}
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-500">Total Number of Trades</td>
                    <td className="px-4 py-3 text-sm font-semibold">{d.total_trades}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">Number of Winning Trades</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      {d.winning_trades} ({d.winning_pct}%)
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">Number of Losing Trades</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">
                      {d.losing_trades} ({d.losing_pct}%)
                    </td>
                  </tr>
                  {/* Row 5: Hold Times */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">Average Hold Time (scratch trades)</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatMinutes(d.avg_hold_time_scratch)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">Average Hold Time (winning trades)</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">{formatMinutes(d.avg_hold_time_winning)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">Average Hold Time (losing trades)</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">{formatMinutes(d.avg_hold_time_losing)}</td>
                  </tr>
                  {/* Row 6: Streaks & Scratch */}
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-500">Number of Scratch Trades</td>
                    <td className="px-4 py-3 text-sm font-semibold">{d.scratch_trades} ({d.scratch_pct}%)</td>
                    <td className="px-4 py-3 text-sm text-gray-500">Max Consecutive Wins</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">{d.max_consecutive_wins}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">Max Consecutive Losses</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">{d.max_consecutive_losses}</td>
                  </tr>
                  {/* Row 7: Advanced Metrics */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">Trade P&L Standard Deviation</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(d.pnl_std_dev)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">System Quality Number (SQN)</td>
                    <td className="px-4 py-3 text-sm font-semibold">{d.sqn !== null ? d.sqn.toFixed(2) : 'n/a'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">Probability of Random Chance</td>
                    <td className="px-4 py-3 text-sm font-semibold">{d.prob_random !== null ? `${d.prob_random}%` : 'n/a'}</td>
                  </tr>
                  {/* Row 8: Kelly & K-Ratio */}
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-500">Kelly Percentage</td>
                    <td className={cn('px-4 py-3 text-sm font-semibold', d.kelly_pct !== null && d.kelly_pct < 0 ? 'text-red-600' : '')}>
                      {d.kelly_pct !== null ? `${d.kelly_pct.toFixed(1)}%` : 'n/a'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">K-Ratio</td>
                    <td className={cn('px-4 py-3 text-sm font-semibold', d.k_ratio !== null && d.k_ratio < 0 ? 'text-red-600' : '')}>
                      {d.k_ratio !== null ? d.k_ratio.toFixed(2) : 'n/a'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">Profit Factor</td>
                    <td className={cn('px-4 py-3 text-sm font-semibold', d.profit_factor >= 1 ? 'text-green-600' : 'text-red-600')}>
                      {d.profit_factor.toFixed(2)}
                    </td>
                  </tr>
                  {/* Row 9: Costs */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">Total Commissions</td>
                    <td className="px-4 py-3 text-sm font-semibold text-orange-600">{formatCurrency(d.total_commissions)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">Total Fees</td>
                    <td className="px-4 py-3 text-sm font-semibold text-orange-600">{formatCurrency(d.total_fees)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Current Streak Card */}
        <Card className={cn(
          'border-2',
          streak_data.current_streak > 0 ? 'border-green-500' : streak_data.current_streak < 0 ? 'border-red-500' : 'border-gray-200'
        )}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {streak_data.current_streak > 0 ? (
                  <Flame className="h-10 w-10 text-green-500" />
                ) : streak_data.current_streak < 0 ? (
                  <AlertTriangle className="h-10 w-10 text-red-500" />
                ) : (
                  <Activity className="h-10 w-10 text-gray-400" />
                )}
                <div>
                  <p className="text-sm text-gray-500">Current Streak</p>
                  <p className={cn(
                    'text-3xl font-bold',
                    streak_data.current_streak > 0 ? 'text-green-600' : streak_data.current_streak < 0 ? 'text-red-600' : 'text-gray-600'
                  )}>
                    {Math.abs(streak_data.current_streak)} {streak_data.current_streak > 0 ? 'Wins' : streak_data.current_streak < 0 ? 'Losses' : 'Neutral'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Streak P&L</p>
                <p className={cn('text-2xl font-bold', getPnLColor(streak_data.current_streak_pnl))}>
                  {formatCurrency(streak_data.current_streak_pnl)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Win Rate Visual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Win/Loss Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-green-600">Winning ({d.winning_pct}%)</span>
                    <span className="text-red-600">Losing ({d.losing_pct}%)</span>
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full overflow-hidden flex">
                    <div className="bg-green-500 h-full" style={{ width: `${d.winning_pct}%` }} />
                    <div className="bg-gray-300 h-full" style={{ width: `${d.scratch_pct}%` }} />
                    <div className="bg-red-500 h-full" style={{ width: `${d.losing_pct}%` }} />
                  </div>
                  <div className="flex justify-center mt-1">
                    <span className="text-xs text-gray-500">Scratch ({d.scratch_pct}%)</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center pt-4">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{d.winning_trades}</p>
                    <p className="text-xs text-gray-500">Wins</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-500">{d.scratch_trades}</p>
                    <p className="text-xs text-gray-500">Scratch</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{d.losing_trades}</p>
                    <p className="text-xs text-gray-500">Losses</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk/Reward Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Avg Win / Avg Loss Ratio</span>
                  <span className="text-xl font-bold">
                    1:{Math.abs(d.avg_winning_trade / d.avg_losing_trade).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Profit Factor</span>
                  <span className={cn('text-xl font-bold', d.profit_factor >= 1 ? 'text-green-600' : 'text-red-600')}>
                    {d.profit_factor.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Kelly %</span>
                  <span className={cn('text-xl font-bold', d.kelly_pct !== null && d.kelly_pct < 0 ? 'text-red-600' : 'text-green-600')}>
                    {d.kelly_pct !== null ? `${d.kelly_pct.toFixed(1)}%` : 'n/a'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">SQN</span>
                  <span className="text-xl font-bold">
                    {d.sqn !== null ? d.sqn.toFixed(2) : 'n/a'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const renderCharts = () => {
    if (!stats) return null

    return (
      <div className="space-y-6">
        {/* Daily P&L Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.daily_pnl}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'P&L']}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {stats.daily_pnl.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cumulative P&L Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cumulative P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stats.daily_pnl}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Cumulative P&L']}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative_pnl"
                    fill={stats.daily_pnl[stats.daily_pnl.length - 1]?.cumulative_pnl >= 0 ? '#22c55e33' : '#ef444433'}
                    stroke={stats.daily_pnl[stats.daily_pnl.length - 1]?.cumulative_pnl >= 0 ? '#22c55e' : '#ef4444'}
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Volume & Win Rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.daily_pnl}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      tickFormatter={(value) => value.slice(5)}
                    />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#F3F4F6' }}
                    />
                    <Bar dataKey="volume" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Win Rate %</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.daily_pnl}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      tickFormatter={(value) => value.slice(5)}
                    />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#F3F4F6' }}
                      formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'Win Rate']}
                    />
                    <Bar dataKey="win_rate" radius={[4, 4, 0, 0]}>
                      {stats.daily_pnl.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.win_rate >= 50 ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* P&L Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>P&L Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.pnl_distribution.filter(d => d.trade_count > 0)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <YAxis dataKey="range_label" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Bar dataKey="trade_count" radius={[0, 4, 4, 0]}>
                    {stats.pnl_distribution.filter(d => d.trade_count > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.range_label.includes('-') ? '#ef4444' : '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderSymbols = () => {
    if (!stats) return null

    // Sort by P&L for top/bottom
    const sortedByPnl = [...stats.by_symbol].sort((a, b) => b.total_pnl - a.total_pnl)
    const top20 = sortedByPnl.filter(s => s.total_pnl > 0).slice(0, 20)
    const bottom20 = sortedByPnl.filter(s => s.total_pnl < 0).slice(-20).reverse()

    // Sort by trade count for volume distribution
    const sortedByVolume = [...stats.by_symbol].sort((a, b) => b.trade_count - a.trade_count).slice(0, 20)

    return (
      <div className="space-y-6">
        {/* Top 20 & Bottom 20 Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 20 Performers */}
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Award className="h-5 w-5" />
                Performance by Symbol - Top 20
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top20} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <YAxis dataKey="symbol" type="category" tick={{ fill: '#6b7280', fontSize: 10 }} width={60} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'P&L']}
                    />
                    <Bar dataKey="total_pnl" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bottom 20 Performers */}
          <Card>
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <XCircle className="h-5 w-5" />
                Performance by Symbol - Bottom 20
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bottom20} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <YAxis dataKey="symbol" type="category" tick={{ fill: '#6b7280', fontSize: 10 }} width={60} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'P&L']}
                    />
                    <Bar dataKey="total_pnl" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribution by Trade Count */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribution by Instrument Volume (Trade Count)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedByVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="symbol" tick={{ fill: '#6b7280', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Bar dataKey="trade_count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Trades" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance by Volume (Trade Count) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Performance by Instrument Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedByVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="symbol" tick={{ fill: '#6b7280', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'P&L']}
                  />
                  <Bar dataKey="total_pnl" radius={[4, 4, 0, 0]} name="P&L">
                    {sortedByVolume.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.total_pnl >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Win Rate by Symbol */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Win Rate by Symbol (Min 3 Trades)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.by_symbol.filter(s => s.trade_count >= 3).sort((a, b) => b.win_rate - a.win_rate).slice(0, 20)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="symbol" tick={{ fill: '#6b7280', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'Win Rate']}
                  />
                  <Bar dataKey="win_rate" radius={[4, 4, 0, 0]} name="Win Rate">
                    {stats.by_symbol.filter(s => s.trade_count >= 3).sort((a, b) => b.win_rate - a.win_rate).slice(0, 20).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.win_rate >= 50 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Symbol Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Symbol Statistics</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trades</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total P&L</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg P&L</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PF</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Best</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Worst</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Hold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.by_symbol.map((s) => (
                    <tr key={s.symbol} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-blue-600">{s.symbol}</td>
                      <td className="px-4 py-3 text-right">{s.trade_count}</td>
                      <td className={cn('px-4 py-3 text-right font-medium', s.win_rate >= 50 ? 'text-green-600' : 'text-red-600')}>
                        {s.win_rate.toFixed(1)}%
                      </td>
                      <td className={cn('px-4 py-3 text-right font-medium', getPnLColor(s.total_pnl))}>
                        {formatCurrency(s.total_pnl)}
                      </td>
                      <td className={cn('px-4 py-3 text-right', getPnLColor(s.avg_pnl))}>
                        {formatCurrency(s.avg_pnl)}
                      </td>
                      <td className={cn('px-4 py-3 text-right', s.profit_factor >= 1 ? 'text-green-600' : 'text-red-600')}>
                        {s.profit_factor.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(s.best_trade)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(s.worst_trade)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {s.avg_holding_minutes ? `${Math.round(s.avg_holding_minutes)}m` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderTimeAnalysis = () => {
    if (!stats) return null

    const hourData = stats.by_hour.filter(h => h.trade_count > 0)

    return (
      <div className="space-y-6">
        {/* Hourly Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              P&L by Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    tickFormatter={(value) => `${value}:00`}
                  />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number | undefined, name: string | undefined) => [
                      name === 'total_pnl' ? formatCurrency(value ?? 0) : `${value ?? 0}%`,
                      name === 'total_pnl' ? 'P&L' : 'Win Rate'
                    ]}
                    labelFormatter={(value) => `${value}:00`}
                  />
                  <Bar dataKey="total_pnl" radius={[4, 4, 0, 0]}>
                    {hourData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.total_pnl >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Day of Week Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Performance by Day of Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-4">
              {stats.by_day_of_week.map((d) => (
                <div
                  key={d.day_of_week}
                  className={cn(
                    'p-4 rounded-lg text-center border-2',
                    d.total_pnl >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  )}
                >
                  <p className="font-semibold text-gray-900">{d.day_name.slice(0, 3)}</p>
                  <p className={cn('text-xl font-bold mt-2', getPnLColor(d.total_pnl))}>
                    {formatCurrency(d.total_pnl)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{d.trade_count} trades</p>
                  <p className={cn('text-sm font-medium', d.win_rate >= 50 ? 'text-green-600' : 'text-red-600')}>
                    {d.win_rate.toFixed(0)}% win
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Holding Time Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance by Holding Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.by_holding_time.filter(h => h.trade_count > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="range_label" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Avg P&L']}
                  />
                  <Bar dataKey="avg_pnl" radius={[4, 4, 0, 0]}>
                    {stats.by_holding_time.filter(h => h.trade_count > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avg_pnl >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderInsights = () => {
    if (!stats) return null

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Trading Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.insights.length === 0 ? (
                <p className="text-gray-500">Not enough data to generate insights. Keep trading!</p>
              ) : (
                stats.insights.map((insight, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-4 rounded-lg border-l-4',
                      insight.includes('⚠️') || insight.includes('🚨') || insight.includes('⛔') || insight.includes('❌')
                        ? 'bg-red-50 border-red-500'
                        : insight.includes('✅') || insight.includes('🔥') || insight.includes('🎯')
                        ? 'bg-green-50 border-green-500'
                        : 'bg-blue-50 border-blue-500'
                    )}
                  >
                    <p className="text-gray-800">{insight}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.summary.win_rate < 50 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-800">Improve Entry Quality</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Your win rate is below 50%. Focus on higher probability setups and wait for better entries.
                  </p>
                </div>
              )}

              {stats.summary.profit_factor < 1 && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-800">Cut Losses Faster</span>
                  </div>
                  <p className="text-sm text-red-700">
                    Your losses outweigh your gains. Consider tighter stop losses or smaller position sizes.
                  </p>
                </div>
              )}

              {stats.streak_data.current_streak < -2 && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-800">Take a Break</span>
                  </div>
                  <p className="text-sm text-red-700">
                    You're on a losing streak. Consider stepping back, reviewing your trades, and returning fresh.
                  </p>
                </div>
              )}

              {stats.summary.win_rate >= 50 && stats.summary.profit_factor >= 1 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">Keep It Up!</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Your metrics are solid. Stay disciplined and consider gradually increasing position size.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderMarketConditionChart = (
    title: string,
    data: { range_label: string; trade_count: number; total_pnl: number; win_rate: number; percentage: number }[],
    showDistribution: boolean = true
  ) => {
    const filteredData = data.filter(d => d.trade_count > 0)
    if (filteredData.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-sm">No data available. Market data will be populated when trades are imported with market conditions.</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribution Chart */}
        {showDistribution && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Distribution: {title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="range_label" tick={{ fill: '#6b7280', fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }}
                      formatter={(value: number | undefined) => [`${value ?? 0} trades`, 'Count']}
                    />
                    <Bar dataKey="trade_count" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance: {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="range_label" tick={{ fill: '#6b7280', fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'P&L']}
                  />
                  <Bar dataKey="total_pnl" radius={[2, 2, 0, 0]}>
                    {filteredData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.total_pnl >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleFetchMarketData = async () => {
    setFetchingMarketData(true)
    setMarketDataMessage(null)
    try {
      const result = await fetchMarketData()
      setMarketDataMessage(result.message)
      // Refresh stats to show new data
      await fetchStats()
    } catch (error) {
      setMarketDataMessage('Failed to fetch market data. Check your API key.')
      console.error('Error fetching market data:', error)
    } finally {
      setFetchingMarketData(false)
    }
  }

  const renderMarketAnalysis = () => {
    if (!stats) return null

    return (
      <div className="space-y-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Market condition analysis requires fetching historical market data from Alpha Vantage.
                  Click the button to fetch data for all traded symbols.
                </p>
                {marketDataMessage && (
                  <p className="text-sm text-green-700 mt-2">{marketDataMessage}</p>
                )}
              </div>
              <Button
                onClick={handleFetchMarketData}
                disabled={fetchingMarketData}
                className="ml-4 whitespace-nowrap"
              >
                {fetchingMarketData ? 'Fetching...' : 'Fetch Market Data'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Volume Analysis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Volume Analysis</h3>
          {renderMarketConditionChart('Instrument Volume', stats.by_volume)}
          {renderMarketConditionChart('Relative Volume (% of 50MA)', stats.by_relative_volume)}
          {renderMarketConditionChart('Prior Day Relative Volume', stats.by_prior_day_volume)}
        </div>

        {/* Price Movement Analysis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Price Movement Analysis</h3>
          {renderMarketConditionChart('Opening Gap %', stats.by_opening_gap)}
          {renderMarketConditionChart('Intraday Movement %', stats.by_day_movement)}
          {renderMarketConditionChart('Day Type', stats.by_day_type)}
        </div>

        {/* Volatility Analysis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Volatility Analysis</h3>
          {renderMarketConditionChart('Average True Range (ATR)', stats.by_atr)}
          {renderMarketConditionChart('Entry % of ATR', stats.by_entry_pct_atr)}
          {renderMarketConditionChart('Relative Volatility (TR/ATR)', stats.by_relative_volatility)}
        </div>

        {/* Trend Analysis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Trend Analysis</h3>
          {renderMarketConditionChart('Price vs 50-Day SMA', stats.by_price_vs_sma50)}
        </div>
      </div>
    )
  }

  const renderRiskRewardTable = (
    title: string,
    data: { range_label: string; trade_count: number; win_count: number; loss_count: number; win_rate: number; total_pnl: number; avg_win: number; avg_loss: number; risk_reward_ratio: number; expectancy: number; total_r: number }[]
  ) => {
    const filteredData = data.filter(d => d.trade_count > 0)
    if (filteredData.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-sm">No data available. Market data is required for this analysis.</p>
          </CardContent>
        </Card>
      )
    }

    // Recalculate R:R based on current baseRisk
    const recalculatedData = filteredData.map(d => ({
      ...d,
      risk_reward_ratio: d.avg_win / baseRisk,
      total_r: d.total_pnl / baseRisk,
      expectancy: (d.win_rate / 100 * d.avg_win) - ((1 - d.win_rate / 100) * d.avg_loss)
    }))

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Range</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Trades</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Win</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Loss</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">R:R</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Expectancy</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total P&L</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total R</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recalculatedData.map((d) => (
                  <tr key={d.range_label} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">{d.range_label}</td>
                    <td className="px-3 py-2 text-sm text-right">{d.trade_count}</td>
                    <td className={cn('px-3 py-2 text-sm text-right font-medium', d.win_rate >= 50 ? 'text-green-600' : 'text-red-600')}>
                      {d.win_rate.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-green-600">{formatCurrency(d.avg_win)}</td>
                    <td className="px-3 py-2 text-sm text-right text-red-600">{formatCurrency(d.avg_loss)}</td>
                    <td className={cn('px-3 py-2 text-sm text-right font-medium', d.risk_reward_ratio >= 1 ? 'text-green-600' : 'text-red-600')}>
                      {d.risk_reward_ratio.toFixed(2)}R
                    </td>
                    <td className={cn('px-3 py-2 text-sm text-right font-medium', d.expectancy >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatCurrency(d.expectancy)}
                    </td>
                    <td className={cn('px-3 py-2 text-sm text-right font-medium', getPnLColor(d.total_pnl))}>
                      {formatCurrency(d.total_pnl)}
                    </td>
                    <td className={cn('px-3 py-2 text-sm text-right font-medium', d.total_r >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {d.total_r >= 0 ? '+' : ''}{d.total_r.toFixed(1)}R
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderRiskRewardChart = (
    title: string,
    data: { range_label: string; trade_count: number; win_rate: number; total_pnl: number; risk_reward_ratio: number }[]
  ) => {
    const filteredData = data.filter(d => d.trade_count > 0)
    if (filteredData.length === 0) return null

    // Recalculate based on current baseRisk
    const chartData = filteredData.map(d => ({
      ...d,
      risk_reward_ratio: d.total_pnl > 0 ? (d.total_pnl / d.trade_count) / baseRisk : 0,
      total_r: d.total_pnl / baseRisk
    }))

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title} - Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="range_label" tick={{ fill: '#6b7280', fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }}
                  formatter={(value: number | undefined, name: string | undefined) => {
                    if (name === 'total_pnl') return [formatCurrency(value ?? 0), 'P&L']
                    if (name === 'win_rate') return [`${(value ?? 0).toFixed(1)}%`, 'Win Rate']
                    return [value ?? 0, name ?? '']
                  }}
                />
                <Bar yAxisId="left" dataKey="total_pnl" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total_pnl >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
                <Area yAxisId="right" type="monotone" dataKey="win_rate" fill="#6366f133" stroke="#6366f1" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderEntryAnalysis = () => {
    if (!stats) return null

    return (
      <div className="space-y-6">
        {/* Base Risk Setting */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Base Risk Setting</h3>
                <p className="text-sm text-gray-600">
                  Set your base risk per trade to calculate R-multiples. R:R ratio shows how many R's you average on winning trades.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Base Risk ($):</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={baseRisk}
                  onChange={(e) => setBaseRisk(Math.max(1, parseFloat(e.target.value) || 5))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entry Price Analysis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Analysis by Entry Price Range
          </h3>
          <p className="text-sm text-gray-600">
            How does your performance vary based on the stock price at entry?
          </p>
          {renderRiskRewardTable('Entry Price Range', stats.by_entry_price)}
          {renderRiskRewardChart('Entry Price Range', stats.by_entry_price)}
        </div>

        {/* Gap Analysis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analysis by Gap from Previous Close
          </h3>
          <p className="text-sm text-gray-600">
            How does your performance vary based on the gap % from the previous day's close?
          </p>
          {renderRiskRewardTable('Gap % from Previous Close', stats.by_gap_percent)}
          {renderRiskRewardChart('Gap % from Previous Close', stats.by_gap_percent)}
        </div>

        {/* Relative Volume 5D Analysis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analysis by Relative Volume (vs 5-Day Avg)
          </h3>
          <p className="text-sm text-gray-600">
            How does your performance vary based on the day's volume compared to the 5-day average?
          </p>
          {renderRiskRewardTable('Relative Volume (5D)', stats.by_relative_volume_5d)}
          {renderRiskRewardChart('Relative Volume (5D)', stats.by_relative_volume_5d)}
        </div>

        {/* Float Analysis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Analysis by Float (流通股)
          </h3>
          <p className="text-sm text-gray-600">
            How does your performance vary based on the stock's float size? Low float stocks tend to be more volatile.
          </p>
          {renderRiskRewardTable('Float Size', stats.by_float)}
          {renderRiskRewardChart('Float Size', stats.by_float)}
        </div>

        {/* Summary Card */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-base">Understanding R-Multiples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-white rounded-lg border">
                <div className="font-medium text-gray-900">R:R Ratio</div>
                <div className="text-gray-600 mt-1">
                  Average winning trade / Base Risk. A 2R means your average winner is 2x your base risk.
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <div className="font-medium text-gray-900">Expectancy</div>
                <div className="text-gray-600 mt-1">
                  (Win Rate × Avg Win) - (Loss Rate × Avg Loss). Your expected profit per trade.
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <div className="font-medium text-gray-900">Total R</div>
                <div className="text-gray-600 mt-1">
                  Total P&L / Base Risk. Shows your overall performance in terms of R-multiples.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'charts', label: 'Charts', icon: Activity },
    { key: 'symbols', label: 'Instruments', icon: Target },
    { key: 'time', label: 'Time Analysis', icon: Clock },
    { key: 'market', label: 'Market Conditions', icon: TrendingUp },
    { key: 'entry', label: 'Entry Analysis', icon: DollarSign },
    { key: 'insights', label: 'Insights', icon: Lightbulb },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
          <p className="text-gray-500 mt-1">Analyze your trading performance</p>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button onClick={handleFilter} disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filter'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDateRange({ start: '', end: '' })
                setTimeout(fetchStats, 0)
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading statistics...</div>
      ) : !stats ? (
        <div className="text-center py-12 text-gray-500">No data available</div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'charts' && renderCharts()}
          {activeTab === 'symbols' && renderSymbols()}
          {activeTab === 'time' && renderTimeAnalysis()}
          {activeTab === 'market' && renderMarketAnalysis()}
          {activeTab === 'entry' && renderEntryAnalysis()}
          {activeTab === 'insights' && renderInsights()}
        </>
      )}
    </div>
  )
}
