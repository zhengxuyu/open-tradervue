import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopAppBar } from '@/components/TopAppBar'
import { TradeTable } from '@/components/TradeTable'
import { PnLValue } from '@/components/Badge'
import {
  getAnalysisSummary,
  getTrades,
  getAdvancedStatistics,
  getPositions,
  type AnalysisSummary,
  type Trade,
  type DailyPnlData,
  type Position,
} from '@/services/api'
import api from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

export function Dashboard() {
  const [summary, setSummary] = useState<AnalysisSummary | null>(null)
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [dailyPnl, setDailyPnl] = useState<DailyPnlData[]>([])
  const [openPositions, setOpenPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, tradesData, statsData, positionsData] = await Promise.all([
          getAnalysisSummary(),
          getTrades({ limit: 10 }),
          getAdvancedStatistics(),
          getPositions({ status: 'open' }),
        ])
        // Auto-seed demo data for new users
        if (summaryData.total_trades === 0) {
          try {
            await api.post('/demo/seed')
            // Re-fetch after seeding
            const [newSummary, newTrades, newStats, newPositions] = await Promise.all([
              getAnalysisSummary(),
              getTrades({ limit: 10 }),
              getAdvancedStatistics(),
              getPositions({ status: 'open' }),
            ])
            setSummary(newSummary)
            setRecentTrades(newTrades)
            setDailyPnl(newStats.daily_pnl.slice(-30))
            setOpenPositions(newPositions)
            return
          } catch (e) {
            console.error('Failed to seed demo data:', e)
          }
        }

        setSummary(summaryData)
        setRecentTrades(tradesData)
        setDailyPnl(statsData.daily_pnl.slice(-30))
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
          <button
            onClick={() => {
              const data = {
                summary,
                recent_trades: recentTrades,
                daily_pnl: dailyPnl,
                exported_at: new Date().toISOString(),
              }
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `dashboard-export-${new Date().toISOString().slice(0, 10)}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="bg-primary text-on-primary text-xs font-label font-bold px-4 py-1.5 rounded-lg uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all"
          >
            Export
          </button>
        }
      />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-surface-container p-6 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent" />
            <p className="text-xs font-label uppercase tracking-widest text-slate-400 mb-2 relative">Total P&L</p>
            <div className="flex items-end gap-2 relative">
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
          <div className="lg:col-span-2 bg-surface-container p-6 rounded-xl">
            <h3 className="text-sm font-headline font-bold text-white uppercase tracking-wider mb-6">
              Cumulative Performance
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyPnl}>
                  <defs>
                    <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    tick={{ fontSize: 10, fill: '#525252' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#525252' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#111413', border: 'none', borderRadius: 8, fontSize: 12, color: '#e5e5e5' }}
                    labelStyle={{ color: '#a3a3a3' }}
                    itemStyle={{ color: '#e5e5e5' }}
                    formatter={(value) => [formatCurrency(Number(value)), 'Cumulative P&L']}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative_pnl"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#pnlGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

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
                    contentStyle={{ background: '#111413', border: 'none', borderRadius: 8, fontSize: 12, color: '#e5e5e5' }} labelStyle={{ color: '#a3a3a3' }} itemStyle={{ color: '#e5e5e5' }}
                    formatter={(value) => [formatCurrency(Number(value)), 'P&L']}
                  />
                  <Bar dataKey="pnl" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                    {dailyPnl.map((entry, index) => (
                      <Cell key={index} fill={entry.pnl >= 0 ? '#34d399' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Open Positions */}
        {openPositions.length > 0 && (
          <div className="bg-surface-container rounded-xl overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10">
              <h3 className="text-sm font-headline font-bold text-on-surface uppercase tracking-wider">
                Open Positions
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {openPositions.map(pos => (
                <div key={pos.id} className="flex justify-between items-center p-4 bg-surface-container-high rounded-xl">
                  <div>
                    <span className="font-data font-bold text-primary">{pos.symbol}</span>
                    <p className="text-xs text-outline mt-1">{pos.quantity} shares @ ${pos.entry_price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
