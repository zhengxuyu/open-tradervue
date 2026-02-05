import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { TradingChart } from '@/components/TradingChart'
import { getPositions, getTrades, updateTrade, deleteTrade, type Position, type Trade } from '@/services/api'
import { formatCurrency, cn, getPnLColor } from '@/lib/utils'
import { ArrowLeft, TrendingUp, TrendingDown, Pencil, Trash2, X, Check } from 'lucide-react'

interface EditingTrade {
  id: number
  notes: string
  commission: number
}

export function DailyPositionDetail() {
  const [searchParams] = useSearchParams()
  const symbol = searchParams.get('symbol') || ''
  const date = searchParams.get('date') || ''

  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Multi-select and edit state
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<number>>(new Set())
  const [editingTrades, setEditingTrades] = useState<Map<number, EditingTrade>>(new Map())
  const [isSaving, setIsSaving] = useState(false)

  const fetchData = async () => {
    if (!symbol || !date) {
      setError('Missing symbol or date')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch positions for this symbol
      const positionsData = await getPositions({ symbol })

      // Filter positions that match the date
      const dayPositions = positionsData.filter(p => p.entry_time.startsWith(date))
      setPositions(dayPositions)

      // Fetch all trades for this symbol on this date
      const tradesData = await getTrades({ symbol })
      const dayTrades = tradesData.filter(t => t.executed_at.startsWith(date))
      setTrades(dayTrades)
    } catch (err) {
      setError('Failed to load position details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [symbol, date])

  const toggleSelectAll = () => {
    if (selectedTradeIds.size === trades.length) {
      setSelectedTradeIds(new Set())
    } else {
      setSelectedTradeIds(new Set(trades.map(t => t.id)))
    }
  }

  const toggleSelect = (tradeId: number) => {
    const newSelected = new Set(selectedTradeIds)
    if (newSelected.has(tradeId)) {
      newSelected.delete(tradeId)
    } else {
      newSelected.add(tradeId)
    }
    setSelectedTradeIds(newSelected)
  }

  const startEditing = () => {
    const editMap = new Map<number, EditingTrade>()
    selectedTradeIds.forEach(id => {
      const trade = trades.find(t => t.id === id)
      if (trade) {
        editMap.set(id, {
          id: trade.id,
          notes: trade.notes || '',
          commission: trade.commission
        })
      }
    })
    setEditingTrades(editMap)
  }

  const cancelEditing = () => {
    setEditingTrades(new Map())
  }

  const updateEditingTrade = (tradeId: number, field: keyof EditingTrade, value: string | number) => {
    const newMap = new Map(editingTrades)
    const trade = newMap.get(tradeId)
    if (trade) {
      newMap.set(tradeId, { ...trade, [field]: value })
      setEditingTrades(newMap)
    }
  }

  const saveEdits = async () => {
    setIsSaving(true)
    try {
      const promises = Array.from(editingTrades.values()).map(edit =>
        updateTrade(edit.id, {
          notes: edit.notes || null,
          commission: edit.commission
        })
      )
      await Promise.all(promises)
      setEditingTrades(new Map())
      setSelectedTradeIds(new Set())
      await fetchData()
    } catch (err) {
      console.error('Failed to save edits:', err)
      alert('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedTradeIds.size} trade(s)?`)) {
      return
    }

    setIsSaving(true)
    try {
      const promises = Array.from(selectedTradeIds).map(id => deleteTrade(id))
      await Promise.all(promises)
      setSelectedTradeIds(new Set())
      await fetchData()
    } catch (err) {
      console.error('Failed to delete trades:', err)
      alert('Failed to delete trades')
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate summary stats
  const totalPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0)
  const totalQuantity = positions.reduce((sum, p) => sum + p.quantity, 0)
  const totalCommission = trades.reduce((sum, t) => sum + t.commission, 0)

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading...</div>
    )
  }

  if (error || trades.length === 0) {
    return (
      <div className="space-y-6">
        <Link to="/trades" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trades
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6 text-center text-red-600">
            {error || 'No trades found for this symbol and date'}
          </CardContent>
        </Card>
      </div>
    )
  }

  const isEditing = editingTrades.size > 0
  const hasSelection = selectedTradeIds.size > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/trades" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {symbol}
              <span className="text-lg font-normal text-gray-500">{date}</span>
            </h1>
            <p className="text-gray-500 mt-1">
              {trades.length} trades, {positions.length} position(s)
            </p>
          </div>
        </div>

        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg',
          totalPnl >= 0 ? 'bg-green-100' : 'bg-red-100'
        )}>
          {totalPnl >= 0 ? (
            <TrendingUp className={cn('h-5 w-5', getPnLColor(totalPnl))} />
          ) : (
            <TrendingDown className={cn('h-5 w-5', getPnLColor(totalPnl))} />
          )}
          <div>
            <p className={cn('text-lg font-bold', getPnLColor(totalPnl))}>
              {formatCurrency(totalPnl)}
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Total Quantity</p>
            <p className="text-xl font-semibold">{totalQuantity}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Trades</p>
            <p className="text-xl font-semibold">{trades.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Commission</p>
            <p className="text-xl font-semibold text-orange-600">
              {formatCurrency(totalCommission)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Net P&L</p>
            <p className={cn('text-xl font-semibold', getPnLColor(totalPnl))}>
              {formatCurrency(totalPnl)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* K-line Chart with all Trade Markers */}
      <TradingChart
        symbol={symbol}
        defaultInterval="1min"
        defaultHeight={600}
        trades={trades.map(t => ({
          id: t.id,
          time: t.executed_at,
          side: t.side,
          price: t.price,
          quantity: t.quantity
        }))}
      />

      {/* All Trades Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Trades ({trades.length})</CardTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditing}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveEdits}
                    disabled={isSaving}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : hasSelection ? (
                <>
                  <span className="text-sm text-gray-500 mr-2">
                    {selectedTradeIds.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditing}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={deleteSelected}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTradeIds.size === trades.length && trades.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Side
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.map((trade) => {
                  const isSelected = selectedTradeIds.has(trade.id)
                  const editData = editingTrades.get(trade.id)

                  return (
                    <tr
                      key={trade.id}
                      className={cn(
                        'hover:bg-gray-50',
                        isSelected && 'bg-blue-50'
                      )}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(trade.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.executed_at.split('T')[1]?.split('.')[0] || ''}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                            trade.side === 'BUY'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          )}
                        >
                          {trade.side}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {trade.quantity}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(trade.price)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(trade.price * trade.quantity)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        {editData ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editData.commission}
                            onChange={(e) => updateEditingTrade(trade.id, 'commission', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-sm text-orange-600">
                            {formatCurrency(trade.commission)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {editData ? (
                          <input
                            type="text"
                            value={editData.notes}
                            onChange={(e) => updateEditingTrade(trade.id, 'notes', e.target.value)}
                            placeholder="Add notes..."
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-sm text-gray-500 max-w-xs truncate block">
                            {trade.notes || '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
