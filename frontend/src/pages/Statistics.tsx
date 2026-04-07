import { useEffect, useState } from 'react'
import { TopAppBar } from '@/components/TopAppBar'
import { Icon } from '@/components/Icon'
import {
  getAdvancedStatistics,
  fetchMarketData,
  type AdvancedStatistics,
} from '@/services/api'
import { formatCurrency, cn, getPnLColor } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ComposedChart, Area, LineChart, Line, ReferenceLine
} from 'recharts'

type TabType = 'hour' | 'day' | 'symbol' | 'holding' | 'pnl' | 'market' | 'risk'

const TABS: { key: TabType; label: string }[] = [
  { key: 'hour', label: 'By Hour' },
  { key: 'day', label: 'By Day of Week' },
  { key: 'symbol', label: 'By Symbol' },
  { key: 'holding', label: 'By Holding Time' },
  { key: 'pnl', label: 'P&L Distribution' },
  { key: 'market', label: 'Market Conditions' },
  { key: 'risk', label: 'Risk & Reward' },
]

const tooltipStyle = {
  backgroundColor: 'var(--color-surface-container)',
  border: '1px solid var(--color-outline-variant)',
  borderRadius: '8px',
  fontSize: '11px',
  color: 'var(--color-on-surface)',
}

const axisTickStyle = { fill: 'var(--color-outline)', fontSize: 10 }

export function Statistics() {
  const [stats, setStats] = useState<AdvancedStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('hour')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
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

  useEffect(() => { fetchStats() }, [])

  const handleFilter = () => { fetchStats() }

  const handleFetchMarketData = async () => {
    setFetchingMarketData(true)
    setMarketDataMessage(null)
    try {
      const result = await fetchMarketData()
      setMarketDataMessage(result.message)
      await fetchStats()
    } catch (error) {
      setMarketDataMessage('Failed to fetch market data. Check your API key.')
      console.error('Error fetching market data:', error)
    } finally {
      setFetchingMarketData(false)
    }
  }

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)}m`
    if (mins < 1440) return `${Math.round(mins / 60)}h`
    return `${Math.round(mins / 1440)}d`
  }

  const winRateColor = (wr: number) => wr >= 50 ? 'text-secondary' : 'text-tertiary'

  // ─── By Hour ─────────────────────────────────────────────────
  const renderByHour = () => {
    if (!stats) return null
    const hourData = stats.by_hour.filter(h => h.trade_count > 0)

    return (
      <div className="space-y-6 p-6">
        {/* Bar chart */}
        <div className="bg-surface-container rounded-xl p-6">
          <p className="text-xs font-label font-bold uppercase tracking-widest text-outline mb-4">Average P&L by Hour</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.15} />
                <XAxis dataKey="hour" tick={axisTickStyle} tickFormatter={(v) => `${v}:00`} />
                <YAxis tick={axisTickStyle} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCurrency(value), 'Avg P&L']} labelFormatter={(v) => `${v}:00`} />
                <Bar dataKey="avg_pnl" radius={[4, 4, 0, 0]}>
                  {hourData.map((entry, i) => (
                    <Cell key={i} fill={entry.avg_pnl >= 0 ? '#66d9cc' : '#ff6762'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/5 bg-surface-container-high">
                <th className="p-4 text-left text-xs font-label font-bold uppercase tracking-widest text-outline">Hour</th>
                <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Trade Count</th>
                <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Win Rate</th>
                <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Avg P&L</th>
                <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Total P&L</th>
              </tr>
            </thead>
            <tbody>
              {hourData.map((h) => (
                <tr key={h.hour} className="border-b border-outline-variant/5 hover:bg-surface-container-high/30">
                  <td className="p-3 text-[11px] font-label text-on-surface">{h.hour}:00</td>
                  <td className="p-3 text-[11px] font-label text-on-surface text-right">{h.trade_count}</td>
                  <td className={cn('p-3 text-[11px] font-label text-right font-bold', winRateColor(h.win_rate))}>{h.win_rate.toFixed(1)}%</td>
                  <td className={cn('p-3 text-[11px] font-label text-right', getPnLColor(h.avg_pnl))}>{formatCurrency(h.avg_pnl)}</td>
                  <td className={cn('p-3 text-[11px] font-label text-right font-bold', getPnLColor(h.total_pnl))}>{formatCurrency(h.total_pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ─── By Day of Week ──────────────────────────────────────────
  const renderByDay = () => {
    if (!stats) return null
    const dayData = stats.by_day_of_week.filter(d => d.trade_count > 0)

    return (
      <div className="space-y-6 p-6">
        {/* Bar chart */}
        <div className="bg-surface-container rounded-xl p-6">
          <p className="text-xs font-label font-bold uppercase tracking-widest text-outline mb-4">Average P&L by Day</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.15} />
                <XAxis dataKey="day_name" tick={axisTickStyle} tickFormatter={(v) => v.slice(0, 3)} />
                <YAxis tick={axisTickStyle} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCurrency(value), 'Avg P&L']} />
                <Bar dataKey="avg_pnl" radius={[4, 4, 0, 0]}>
                  {dayData.map((entry, i) => (
                    <Cell key={i} fill={entry.avg_pnl >= 0 ? '#66d9cc' : '#ff6762'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/5 bg-surface-container-high">
                <th className="p-4 text-left text-xs font-label font-bold uppercase tracking-widest text-outline">Day</th>
                <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Trade Count</th>
                <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Win Rate</th>
                <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Avg P&L</th>
                <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Total P&L</th>
              </tr>
            </thead>
            <tbody>
              {dayData.map((d) => (
                <tr key={d.day_of_week} className="border-b border-outline-variant/5 hover:bg-surface-container-high/30">
                  <td className="p-3 text-[11px] font-label text-on-surface">{d.day_name}</td>
                  <td className="p-3 text-[11px] font-label text-on-surface text-right">{d.trade_count}</td>
                  <td className={cn('p-3 text-[11px] font-label text-right font-bold', winRateColor(d.win_rate))}>{d.win_rate.toFixed(1)}%</td>
                  <td className={cn('p-3 text-[11px] font-label text-right', getPnLColor(d.avg_pnl))}>{formatCurrency(d.avg_pnl)}</td>
                  <td className={cn('p-3 text-[11px] font-label text-right font-bold', getPnLColor(d.total_pnl))}>{formatCurrency(d.total_pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ─── By Symbol ───────────────────────────────────────────────
  const renderBySymbol = () => {
    if (!stats) return null
    const sortedByPnl = [...stats.by_symbol].sort((a, b) => b.total_pnl - a.total_pnl)

    return (
      <div className="space-y-6 p-6">
        {/* Top performers chart */}
        <div className="bg-surface-container rounded-xl p-6">
          <p className="text-xs font-label font-bold uppercase tracking-widest text-outline mb-4">P&L by Symbol</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedByPnl.slice(0, 20)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.15} />
                <XAxis type="number" tick={axisTickStyle} />
                <YAxis dataKey="symbol" type="category" tick={axisTickStyle} width={60} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCurrency(value), 'P&L']} />
                <Bar dataKey="total_pnl" radius={[0, 4, 4, 0]}>
                  {sortedByPnl.slice(0, 20).map((entry, i) => (
                    <Cell key={i} fill={entry.total_pnl >= 0 ? '#66d9cc' : '#ff6762'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Full table */}
        <div className="bg-surface-container rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/5 bg-surface-container-high">
                  <th className="p-4 text-left text-xs font-label font-bold uppercase tracking-widest text-outline">Symbol</th>
                  <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Trades</th>
                  <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Win Rate</th>
                  <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Total P&L</th>
                  <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Avg P&L</th>
                  <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">PF</th>
                  <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Best</th>
                  <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Worst</th>
                  <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Avg Hold</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_symbol.sort((a, b) => b.total_pnl - a.total_pnl).map((s) => (
                  <tr key={s.symbol} className="border-b border-outline-variant/5 hover:bg-surface-container-high/30">
                    <td className="p-3 text-[11px] font-label font-bold text-primary">{s.symbol}</td>
                    <td className="p-3 text-[11px] font-label text-on-surface text-right">{s.trade_count}</td>
                    <td className={cn('p-3 text-[11px] font-label text-right font-bold', winRateColor(s.win_rate))}>{s.win_rate.toFixed(1)}%</td>
                    <td className={cn('p-3 text-[11px] font-label text-right font-bold', getPnLColor(s.total_pnl))}>{formatCurrency(s.total_pnl)}</td>
                    <td className={cn('p-3 text-[11px] font-label text-right', getPnLColor(s.avg_pnl))}>{formatCurrency(s.avg_pnl)}</td>
                    <td className={cn('p-3 text-[11px] font-label text-right', s.profit_factor >= 1 ? 'text-secondary' : 'text-tertiary')}>{s.profit_factor.toFixed(2)}</td>
                    <td className="p-3 text-[11px] font-label text-right text-secondary">{formatCurrency(s.best_trade)}</td>
                    <td className="p-3 text-[11px] font-label text-right text-tertiary">{formatCurrency(s.worst_trade)}</td>
                    <td className="p-3 text-[11px] font-label text-right text-outline">{s.avg_holding_minutes ? formatMinutes(s.avg_holding_minutes) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ─── By Holding Time ─────────────────────────────────────────
  const renderByHolding = () => {
    if (!stats) return null
    const holdData = stats.by_holding_time.filter(h => h.trade_count > 0)

    return (
      <div className="space-y-6 p-6">
        {/* Horizontal bar chart */}
        <div className="bg-surface-container rounded-xl p-6">
          <p className="text-xs font-label font-bold uppercase tracking-widest text-outline mb-4">Avg P&L by Holding Time</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={holdData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.15} />
                <XAxis type="number" tick={axisTickStyle} />
                <YAxis dataKey="range_label" type="category" tick={axisTickStyle} width={100} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCurrency(value), 'Avg P&L']} />
                <Bar dataKey="avg_pnl" radius={[0, 4, 4, 0]}>
                  {holdData.map((entry, i) => (
                    <Cell key={i} fill={entry.avg_pnl >= 0 ? '#66d9cc' : '#ff6762'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/5 bg-surface-container-high">
                <th className="p-4 text-left text-xs font-label font-bold uppercase tracking-widest text-outline">Range</th>
                <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Trade Count</th>
                <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Win Rate</th>
                <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Avg P&L</th>
                <th className="p-4 text-right text-xs font-label font-bold uppercase tracking-widest text-outline">Total P&L</th>
              </tr>
            </thead>
            <tbody>
              {holdData.map((h) => (
                <tr key={h.range_label} className="border-b border-outline-variant/5 hover:bg-surface-container-high/30">
                  <td className="p-3 text-[11px] font-label text-on-surface">{h.range_label}</td>
                  <td className="p-3 text-[11px] font-label text-on-surface text-right">{h.trade_count}</td>
                  <td className={cn('p-3 text-[11px] font-label text-right font-bold', winRateColor(h.win_rate))}>{h.win_rate.toFixed(1)}%</td>
                  <td className={cn('p-3 text-[11px] font-label text-right', getPnLColor(h.avg_pnl))}>{formatCurrency(h.avg_pnl)}</td>
                  <td className={cn('p-3 text-[11px] font-label text-right font-bold', getPnLColor(h.total_pnl))}>{formatCurrency(h.total_pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ─── P&L Distribution ────────────────────────────────────────
  const renderPnlDistribution = () => {
    if (!stats) return null
    const distData = stats.pnl_distribution.filter(d => d.trade_count > 0)
    const d = stats.detailed_summary

    // Compute distribution statistics
    const mean = d.avg_trade_pnl
    const stdDev = d.pnl_std_dev
    // Median, skewness, kurtosis approximations from available data
    const totalTrades = d.total_trades

    return (
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Histogram */}
          <div className="lg:col-span-3 bg-surface-container rounded-xl p-6">
            <p className="text-xs font-label font-bold uppercase tracking-widest text-outline mb-4">P&L Distribution Histogram</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.15} />
                  <XAxis dataKey="range_label" tick={axisTickStyle} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={axisTickStyle} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} trades`, 'Count']} />
                  <Bar dataKey="trade_count" radius={[4, 4, 0, 0]}>
                    {distData.map((entry, i) => (
                      <Cell key={i} fill={entry.range_label.startsWith('-') || entry.range_label.startsWith('< -') ? '#ff6762' : '#66d9cc'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats card */}
          <div className="lg:col-span-1 bg-surface-container p-6 rounded-xl space-y-5">
            <p className="text-xs font-label font-bold uppercase tracking-widest text-outline mb-2">Distribution Stats</p>
            <div>
              <p className="text-[10px] font-label text-outline uppercase tracking-wider">Mean</p>
              <p className={cn('text-lg font-headline font-bold', getPnLColor(mean))}>{formatCurrency(mean)}</p>
            </div>
            <div>
              <p className="text-[10px] font-label text-outline uppercase tracking-wider">Std Dev</p>
              <p className="text-lg font-headline font-bold text-on-surface">{formatCurrency(stdDev)}</p>
            </div>
            <div>
              <p className="text-[10px] font-label text-outline uppercase tracking-wider">Total Trades</p>
              <p className="text-lg font-headline font-bold text-on-surface">{totalTrades}</p>
            </div>
            <div>
              <p className="text-[10px] font-label text-outline uppercase tracking-wider">Profit Factor</p>
              <p className={cn('text-lg font-headline font-bold', d.profit_factor >= 1 ? 'text-secondary' : 'text-tertiary')}>{d.profit_factor.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] font-label text-outline uppercase tracking-wider">SQN</p>
              <p className="text-lg font-headline font-bold text-on-surface">{d.sqn !== null ? d.sqn.toFixed(2) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-label text-outline uppercase tracking-wider">Kelly %</p>
              <p className={cn('text-lg font-headline font-bold', d.kelly_pct !== null && d.kelly_pct < 0 ? 'text-tertiary' : 'text-secondary')}>
                {d.kelly_pct !== null ? `${d.kelly_pct.toFixed(1)}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Market Conditions ───────────────────────────────────────
  const renderMarketConditionCard = (
    title: string,
    iconName: string,
    data: { range_label: string; trade_count: number; total_pnl: number; win_rate: number; avg_pnl: number; percentage: number }[]
  ) => {
    const filteredData = data.filter(d => d.trade_count > 0)
    if (filteredData.length === 0) {
      return (
        <div className="bg-surface-container rounded-xl overflow-hidden">
          <div className="p-4 border-b border-outline-variant/5 bg-surface-container-high flex items-center gap-2">
            <Icon name={iconName} className="text-sm text-outline" />
            <span className="text-xs font-label font-bold uppercase tracking-widest text-outline">{title}</span>
          </div>
          <div className="p-4">
            <p className="text-[11px] font-label text-outline">No data available</p>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-surface-container rounded-xl overflow-hidden">
        <div className="p-4 border-b border-outline-variant/5 bg-surface-container-high flex items-center gap-2">
          <Icon name={iconName} className="text-sm text-outline" />
          <span className="text-xs font-label font-bold uppercase tracking-widest text-outline">{title}</span>
        </div>
        <div className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/5">
                <th className="px-4 py-2 text-left text-[10px] font-label font-bold uppercase tracking-widest text-outline">State</th>
                <th className="px-4 py-2 text-right text-[10px] font-label font-bold uppercase tracking-widest text-outline">Win%</th>
                <th className="px-4 py-2 text-right text-[10px] font-label font-bold uppercase tracking-widest text-outline">Avg P&L</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((d) => (
                <tr key={d.range_label} className="border-b border-outline-variant/5 last:border-b-0">
                  <td className="px-4 py-2 text-[11px] font-label text-on-surface">{d.range_label}</td>
                  <td className={cn('px-4 py-2 text-[11px] font-label text-right font-bold', winRateColor(d.win_rate))}>{d.win_rate.toFixed(0)}%</td>
                  <td className={cn('px-4 py-2 text-[11px] font-label text-right', getPnLColor(d.avg_pnl))}>{formatCurrency(d.avg_pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderMarketConditions = () => {
    if (!stats) return null

    return (
      <div className="space-y-6 p-6">
        {/* Fetch button */}
        <div className="bg-surface-container rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-label text-on-surface">
              Market condition analysis requires historical market data from Alpha Vantage.
            </p>
            {marketDataMessage && (
              <p className="text-[11px] font-label text-secondary mt-1">{marketDataMessage}</p>
            )}
          </div>
          <button
            onClick={handleFetchMarketData}
            disabled={fetchingMarketData}
            className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-label font-bold hover:bg-primary/20 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {fetchingMarketData ? 'Fetching...' : 'Fetch Market Data'}
          </button>
        </div>

        {/* Grid of condition cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderMarketConditionCard('Volume Level', 'bar_chart', stats.by_volume)}
          {renderMarketConditionCard('Relative Volume', 'speed', stats.by_relative_volume)}
          {renderMarketConditionCard('Price vs SMA50', 'trending_up', stats.by_price_vs_sma50)}
          {renderMarketConditionCard('Opening Gap', 'open_in_new', stats.by_opening_gap)}
          {renderMarketConditionCard('ATR Level', 'show_chart', stats.by_atr)}
          {renderMarketConditionCard('Day Movement', 'swap_vert', stats.by_day_movement)}
          {renderMarketConditionCard('Day Type', 'category', stats.by_day_type)}
          {renderMarketConditionCard('Relative Volatility', 'bolt', stats.by_relative_volatility)}
          {renderMarketConditionCard('Prior Day Volume', 'history', stats.by_prior_day_volume)}
          {renderMarketConditionCard('Entry % of ATR', 'percent', stats.by_entry_pct_atr)}
        </div>
      </div>
    )
  }

  // ─── Risk & Reward ───────────────────────────────────────────
  const renderRiskRewardTable = (
    title: string,
    data: { range_label: string; trade_count: number; win_count: number; loss_count: number; win_rate: number; total_pnl: number; avg_win: number; avg_loss: number; risk_reward_ratio: number; expectancy: number; total_r: number }[]
  ) => {
    const filteredData = data.filter(d => d.trade_count > 0)
    if (filteredData.length === 0) {
      return (
        <div className="bg-surface-container rounded-xl p-4">
          <p className="text-xs font-label font-bold uppercase tracking-widest text-outline mb-2">{title}</p>
          <p className="text-[11px] font-label text-outline">No data available. Market data is required.</p>
        </div>
      )
    }

    const recalculatedData = filteredData.map(d => ({
      ...d,
      risk_reward_ratio: d.avg_win / baseRisk,
      total_r: d.total_pnl / baseRisk,
      expectancy: (d.win_rate / 100 * d.avg_win) - ((1 - d.win_rate / 100) * d.avg_loss)
    }))

    return (
      <div className="bg-surface-container rounded-xl overflow-hidden">
        <div className="p-4 border-b border-outline-variant/5 bg-surface-container-high">
          <span className="text-xs font-label font-bold uppercase tracking-widest text-outline">{title}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/5">
                <th className="p-3 text-left text-[10px] font-label font-bold uppercase tracking-widest text-outline">Range</th>
                <th className="p-3 text-right text-[10px] font-label font-bold uppercase tracking-widest text-outline">Trades</th>
                <th className="p-3 text-right text-[10px] font-label font-bold uppercase tracking-widest text-outline">Win Rate</th>
                <th className="p-3 text-right text-[10px] font-label font-bold uppercase tracking-widest text-outline">Avg Win</th>
                <th className="p-3 text-right text-[10px] font-label font-bold uppercase tracking-widest text-outline">Avg Loss</th>
                <th className="p-3 text-right text-[10px] font-label font-bold uppercase tracking-widest text-outline">R:R</th>
                <th className="p-3 text-right text-[10px] font-label font-bold uppercase tracking-widest text-outline">Expectancy</th>
                <th className="p-3 text-right text-[10px] font-label font-bold uppercase tracking-widest text-outline">Total P&L</th>
                <th className="p-3 text-right text-[10px] font-label font-bold uppercase tracking-widest text-outline">Total R</th>
              </tr>
            </thead>
            <tbody>
              {recalculatedData.map((d) => (
                <tr key={d.range_label} className="border-b border-outline-variant/5 last:border-b-0 hover:bg-surface-container-high/30">
                  <td className="p-3 text-[11px] font-label text-on-surface font-bold">{d.range_label}</td>
                  <td className="p-3 text-[11px] font-label text-on-surface text-right">{d.trade_count}</td>
                  <td className={cn('p-3 text-[11px] font-label text-right font-bold', winRateColor(d.win_rate))}>{d.win_rate.toFixed(1)}%</td>
                  <td className="p-3 text-[11px] font-label text-right text-secondary">{formatCurrency(d.avg_win)}</td>
                  <td className="p-3 text-[11px] font-label text-right text-tertiary">{formatCurrency(d.avg_loss)}</td>
                  <td className={cn('p-3 text-[11px] font-label text-right font-bold', d.risk_reward_ratio >= 1 ? 'text-secondary' : 'text-tertiary')}>{d.risk_reward_ratio.toFixed(2)}R</td>
                  <td className={cn('p-3 text-[11px] font-label text-right font-bold', d.expectancy >= 0 ? 'text-secondary' : 'text-tertiary')}>{formatCurrency(d.expectancy)}</td>
                  <td className={cn('p-3 text-[11px] font-label text-right font-bold', getPnLColor(d.total_pnl))}>{formatCurrency(d.total_pnl)}</td>
                  <td className={cn('p-3 text-[11px] font-label text-right font-bold', d.total_r >= 0 ? 'text-secondary' : 'text-tertiary')}>
                    {d.total_r >= 0 ? '+' : ''}{d.total_r.toFixed(1)}R
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderRiskReward = () => {
    if (!stats) return null

    return (
      <div className="space-y-6 p-6">
        {/* Base Risk input */}
        <div className="bg-surface-container rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Icon name="shield" className="text-lg text-primary" />
            <div>
              <p className="text-[11px] font-label text-on-surface font-bold">Base Risk Setting</p>
              <p className="text-[10px] font-label text-outline">Set your base risk per trade to calculate R-multiples</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-label text-outline uppercase tracking-wider">Base Risk ($)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={baseRisk}
              onChange={(e) => setBaseRisk(Math.max(1, parseFloat(e.target.value) || 5))}
              className="w-20 px-3 py-1.5 bg-surface-container-high border border-outline-variant/30 rounded-lg text-xs font-label text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Tables */}
        <div className="space-y-4">
          <p className="text-xs font-label font-bold uppercase tracking-widest text-outline px-1">By Entry Price Range</p>
          {renderRiskRewardTable('Entry Price Range', stats.by_entry_price)}
        </div>

        <div className="space-y-4">
          <p className="text-xs font-label font-bold uppercase tracking-widest text-outline px-1">By Gap % from Previous Close</p>
          {renderRiskRewardTable('Gap % from Previous Close', stats.by_gap_percent)}
        </div>

        <div className="space-y-4">
          <p className="text-xs font-label font-bold uppercase tracking-widest text-outline px-1">By Relative Volume (5D Avg)</p>
          {renderRiskRewardTable('Relative Volume (5D)', stats.by_relative_volume_5d)}
        </div>

        <div className="space-y-4">
          <p className="text-xs font-label font-bold uppercase tracking-widest text-outline px-1">By Float Size</p>
          {renderRiskRewardTable('Float Size', stats.by_float)}
        </div>

        {/* R-Multiple explainer */}
        <div className="bg-surface-container rounded-xl p-5">
          <p className="text-xs font-label font-bold uppercase tracking-widest text-outline mb-4">Understanding R-Multiples</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-surface-container-high rounded-lg">
              <p className="text-[11px] font-label font-bold text-on-surface">R:R Ratio</p>
              <p className="text-[10px] font-label text-outline mt-1">Average winning trade / Base Risk. A 2R means your average winner is 2x your base risk.</p>
            </div>
            <div className="p-3 bg-surface-container-high rounded-lg">
              <p className="text-[11px] font-label font-bold text-on-surface">Expectancy</p>
              <p className="text-[10px] font-label text-outline mt-1">(Win Rate x Avg Win) - (Loss Rate x Avg Loss). Expected profit per trade.</p>
            </div>
            <div className="p-3 bg-surface-container-high rounded-lg">
              <p className="text-[11px] font-label font-bold text-on-surface">Total R</p>
              <p className="text-[10px] font-label text-outline mt-1">Total P&L / Base Risk. Overall performance in R-multiples.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main Render ─────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopAppBar
        title="Statistics"
        actions={
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1.5 bg-surface-container border border-outline-variant/30 rounded-lg text-xs font-label text-on-surface focus:outline-none focus:border-primary"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1.5 bg-surface-container border border-outline-variant/30 rounded-lg text-xs font-label text-on-surface focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleFilter}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-label font-bold hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Apply'}
            </button>
            <button
              onClick={() => { setDateRange({ start: '', end: '' }); setTimeout(fetchStats, 0) }}
              className="px-3 py-1.5 rounded-lg text-outline text-xs font-label hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              Reset
            </button>
          </div>
        }
      />

      {/* Tab Bar */}
      <div className="bg-surface-container-lowest px-6 border-b border-outline-variant/10 overflow-x-auto">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-5 py-3 text-xs font-label uppercase tracking-widest whitespace-nowrap transition-colors border-b-2',
                activeTab === tab.key
                  ? 'text-primary border-primary'
                  : 'text-slate-500 hover:text-on-surface border-transparent'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-outline text-sm font-label">Loading statistics...</p>
          </div>
        ) : !stats ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-outline text-sm font-label">No data available</p>
          </div>
        ) : (
          <>
            {activeTab === 'hour' && renderByHour()}
            {activeTab === 'day' && renderByDay()}
            {activeTab === 'symbol' && renderBySymbol()}
            {activeTab === 'holding' && renderByHolding()}
            {activeTab === 'pnl' && renderPnlDistribution()}
            {activeTab === 'market' && renderMarketConditions()}
            {activeTab === 'risk' && renderRiskReward()}
          </>
        )}
      </div>
    </div>
  )
}
