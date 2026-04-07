import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TopAppBar } from '@/components/TopAppBar'
import { Icon } from '@/components/Icon'
import { TradingViewWidget } from '@/components/TradingViewWidget'
import { getPositions, getAnalysisBySymbol, type SymbolAnalysis, type Position } from '@/services/api'
import { formatCurrency, cn } from '@/lib/utils'
import { PnLValue } from '@/components/Badge'

export function Charts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [symbol, setSymbol] = useState(searchParams.get('symbol') || '')
  const [symbols, setSymbols] = useState<SymbolAnalysis[]>([])
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null)
  const [trades, setTrades] = useState<Position[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const data = await getAnalysisBySymbol()
        setSymbols(data)
      } catch (err) {
        console.error('Failed to fetch symbols:', err)
      }
    }
    fetchSymbols()
  }, [])

  useEffect(() => {
    const symbolParam = searchParams.get('symbol')
    if (symbolParam && symbolParam !== activeSymbol) {
      loadSymbol(symbolParam)
    }
  }, [searchParams])

  const loadSymbol = async (sym: string) => {
    setLoading(true)
    setActiveSymbol(sym)
    setSearchParams({ symbol: sym })

    try {
      const positions = await getPositions({ symbol: sym })
      setTrades(positions)
    } catch (err) {
      console.error('Failed to fetch trades:', err)
      setTrades([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (symbol) {
      loadSymbol(symbol.toUpperCase())
    }
  }

  return (
    <div className="space-y-0">
      <TopAppBar
        title="Charts"
        actions={
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Symbol..."
                className="w-48 pl-9 pr-3 py-1.5 bg-surface-container-low border border-outline-variant/10 rounded-lg text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !symbol}
              className="px-4 py-1.5 bg-primary text-on-primary text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              {loading ? 'Loading...' : 'Load'}
            </button>
          </form>
        }
      />

      <div className="px-6 pt-4 space-y-4">
        {/* Symbol chips */}
        {symbols.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {symbols.map(s => (
              <button
                key={s.symbol}
                onClick={() => {
                  setSymbol(s.symbol)
                  loadSymbol(s.symbol)
                }}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                  activeSymbol === s.symbol
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-outline hover:text-on-surface hover:bg-surface-container-high'
                )}
              >
                {s.symbol}
              </button>
            ))}
          </div>
        )}

        {activeSymbol && (
          <>
            {/* Technical info ribbon */}
            <div className="flex items-center gap-6 px-4 py-3 bg-surface-container rounded-xl">
              <div className="flex items-center gap-2">
                <Icon name="candlestick_chart" className="text-primary text-[20px]" />
                <span className="text-on-surface font-bold text-sm">{activeSymbol}</span>
              </div>
              <div className="text-[10px] font-label uppercase tracking-widest text-outline">
                {trades.length} position{trades.length !== 1 ? 's' : ''} found
              </div>
            </div>

            {/* Main chart area */}
            <TradingViewWidget
              symbol={activeSymbol}
              defaultInterval="1"
              theme="dark"
              defaultHeight={600}
            />

            {/* Bottom panel: trades table */}
            {trades.length > 0 && (
              <div className="bg-surface-container rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/10">
                  <h3 className="text-sm font-semibold text-on-surface">
                    {activeSymbol} Positions
                    <span className="ml-2 text-[10px] font-label text-outline uppercase tracking-wider">
                      {trades.length} total
                    </span>
                  </h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low text-[10px] font-label uppercase tracking-widest text-outline sticky top-0">
                      <tr>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium text-right">Qty</th>
                        <th className="px-6 py-3 font-medium text-right">Entry</th>
                        <th className="px-6 py-3 font-medium text-right">Exit</th>
                        <th className="px-6 py-3 font-medium text-right">P&L</th>
                        <th className="px-6 py-3 font-medium">Entry Time</th>
                        <th className="px-6 py-3 font-medium">Exit Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-surface-container-high transition-colors">
                          <td className="px-6 py-3">
                            <span className={cn(
                              'inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full',
                              trade.status === 'open'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-surface-variant text-on-surface-variant'
                            )}>
                              {trade.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs font-data text-on-surface text-right">{trade.quantity}</td>
                          <td className="px-6 py-3 text-xs font-data text-on-surface text-right">{formatCurrency(trade.entry_price)}</td>
                          <td className="px-6 py-3 text-xs font-data text-on-surface text-right">
                            {trade.exit_price ? formatCurrency(trade.exit_price) : '-'}
                          </td>
                          <td className="px-6 py-3 text-right">
                            {trade.pnl !== null ? (
                              <PnLValue value={trade.pnl} className="text-xs font-data" />
                            ) : (
                              <span className="text-xs text-outline">-</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-xs text-outline">
                            {new Date(trade.entry_time).toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-xs text-outline">
                            {trade.exit_time ? new Date(trade.exit_time).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!activeSymbol && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Icon name="candlestick_chart" className="text-outline/30 text-6xl mb-4" />
            <p className="text-on-surface font-medium">Enter a symbol to view its chart</p>
            <p className="text-outline text-sm mt-1">
              Full TradingView features: drawing tools, indicators, multiple timeframes
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
