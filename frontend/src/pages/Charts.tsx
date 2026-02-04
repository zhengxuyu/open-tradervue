import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { TradingViewWidget } from '@/components/TradingViewWidget'
import { getPositions, getAnalysisBySymbol, type SymbolAnalysis, type Position } from '@/services/api'
import { Search } from 'lucide-react'
import { formatCurrency, cn, getPnLColor } from '@/lib/utils'

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

    // Fetch trades for this symbol
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chart Analysis</h1>
        <p className="text-gray-500 mt-1">View K-line charts with TradingView</p>
      </div>

      <Card>
        <CardContent className="py-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Enter symbol (e.g., AAPL, TSLA, MSFT)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button type="submit" disabled={loading || !symbol}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Loading...' : 'Load Chart'}
            </Button>
          </form>

          {symbols.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Your traded symbols:</p>
              <div className="flex flex-wrap gap-2">
                {symbols.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => {
                      setSymbol(s.symbol)
                      loadSymbol(s.symbol)
                    }}
                    className={cn(
                      'px-3 py-1 text-sm rounded-full transition-colors',
                      activeSymbol === s.symbol
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    )}
                  >
                    {s.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {activeSymbol && (
        <div className="space-y-4">
          {/* TradingView Chart */}
          <TradingViewWidget
            symbol={activeSymbol}
            defaultInterval="1"
            theme="dark"
            defaultHeight={600}
          />

          {/* Trade History for this symbol */}
          {trades.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your {activeSymbol} Trades ({trades.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Entry</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Exit</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">P&L</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entry Time</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Exit Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <span className={cn(
                              'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                              trade.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            )}>
                              {trade.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{trade.quantity}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatCurrency(trade.entry_price)}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {trade.exit_price ? formatCurrency(trade.exit_price) : '-'}
                          </td>
                          <td className={cn('px-4 py-2 text-sm font-medium text-right', trade.pnl !== null ? getPnLColor(trade.pnl) : '')}>
                            {trade.pnl !== null ? formatCurrency(trade.pnl) : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {new Date(trade.entry_time).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {trade.exit_time ? new Date(trade.exit_time).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!activeSymbol && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Enter a symbol above to view its TradingView chart</p>
            <p className="text-sm text-gray-400 mt-2">
              Full TradingView features: Drawing tools, indicators, multiple timeframes
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
