import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { TopAppBar } from '@/components/TopAppBar'
import { Icon } from '@/components/Icon'
import { SideBadge, PnLValue } from '@/components/Badge'
import { TradingViewWidget } from '@/components/TradingViewWidget'
import { getPositions, getTrades, updateTrade, deleteTrade, type Position, type Trade } from '@/services/api'
import { formatCurrency, cn } from '@/lib/utils'

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
      const positionsData = await getPositions({ symbol })
      const dayPositions = positionsData.filter(p => p.entry_time.startsWith(date))
      setPositions(dayPositions)

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
      <div className="flex items-center justify-center py-24">
        <div className="text-outline text-sm">Loading...</div>
      </div>
    )
  }

  if (error || trades.length === 0) {
    return (
      <div className="space-y-0">
        <TopAppBar
          title="Daily Position"
          actions={
            <Link to="/trades" className="flex items-center gap-1 text-primary text-sm hover:underline">
              <Icon name="arrow_back" className="text-[18px]" />
              Back
            </Link>
          }
        />
        <div className="px-6 pt-8">
          <div className="bg-tertiary-container/10 border border-tertiary-container/20 rounded-xl p-6 text-center text-tertiary-container">
            {error || 'No trades found for this symbol and date'}
          </div>
        </div>
      </div>
    )
  }

  const isEditing = editingTrades.size > 0
  const hasSelection = selectedTradeIds.size > 0

  return (
    <div className="space-y-0">
      <TopAppBar
        title="Daily Position"
        actions={
          <Link to="/trades" className="flex items-center gap-1 text-primary text-sm hover:underline">
            <Icon name="arrow_back" className="text-[18px]" />
            Back to Trades
          </Link>
        }
      />

      <div className="px-6 pt-6 space-y-6">
        {/* Header section */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface">
                {symbol}
              </h1>
              <span className="text-outline text-lg font-medium">{date}</span>
            </div>
            <p className="text-outline text-sm mt-1">
              {trades.length} trade{trades.length !== 1 ? 's' : ''}, {positions.length} position{positions.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="text-right">
            <PnLValue value={totalPnl} className="text-2xl font-extrabold font-data" />
          </div>
        </div>

        {/* Summary cards row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface-container p-5 rounded-xl">
            <div className="text-[10px] font-label uppercase tracking-widest text-outline mb-2">Total Quantity</div>
            <div className="text-xl font-bold font-data tabular-nums text-on-surface">{totalQuantity}</div>
          </div>
          <div className="bg-surface-container p-5 rounded-xl">
            <div className="text-[10px] font-label uppercase tracking-widest text-outline mb-2">Trades</div>
            <div className="text-xl font-bold font-data tabular-nums text-on-surface">{trades.length}</div>
          </div>
          <div className="bg-surface-container p-5 rounded-xl">
            <div className="text-[10px] font-label uppercase tracking-widest text-outline mb-2">Commission</div>
            <div className="text-xl font-bold font-data tabular-nums text-on-surface">
              {formatCurrency(totalCommission)}
            </div>
          </div>
          <div className="bg-surface-container p-5 rounded-xl border-l-2 border-secondary">
            <div className="text-[10px] font-label uppercase tracking-widest text-outline mb-2">Net P&L</div>
            <div className="text-xl font-bold font-data tabular-nums">
              <PnLValue value={totalPnl} className="text-xl" />
            </div>
          </div>
        </div>

        {/* Split layout: chart + trades */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Chart */}
          <div className="lg:col-span-8">
            <TradingViewWidget
              symbol={symbol}
              defaultInterval="1"
              defaultHeight={500}
              focusTime={trades.find(t => t.side === 'BUY')?.executed_at}
            />
          </div>

          {/* Right: Trades table */}
          <div className="lg:col-span-4">
            <div className="bg-surface-container rounded-xl overflow-hidden h-full flex flex-col">
              <div className="px-4 py-3 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-semibold text-on-surface">
                  All Trades
                  <span className="ml-2 text-[10px] font-label text-outline uppercase tracking-wider">
                    {trades.length}
                  </span>
                </h3>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        onClick={cancelEditing}
                        disabled={isSaving}
                        className="p-1 text-outline hover:text-on-surface rounded transition-colors"
                      >
                        <Icon name="close" className="text-[16px]" />
                      </button>
                      <button
                        onClick={saveEdits}
                        disabled={isSaving}
                        className="p-1 text-primary hover:text-primary/80 rounded transition-colors"
                      >
                        <Icon name="check" className="text-[16px]" />
                      </button>
                    </>
                  ) : hasSelection ? (
                    <>
                      <span className="text-[10px] text-outline mr-1">{selectedTradeIds.size} sel</span>
                      <button
                        onClick={startEditing}
                        className="p-1 text-outline hover:text-on-surface rounded transition-colors"
                      >
                        <Icon name="edit" className="text-[16px]" />
                      </button>
                      <button
                        onClick={deleteSelected}
                        disabled={isSaving}
                        className="p-1 text-tertiary hover:text-tertiary/80 rounded transition-colors"
                      >
                        <Icon name="delete" className="text-[16px]" />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low text-[10px] font-label uppercase tracking-widest text-outline sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-medium w-8">
                        <input
                          type="checkbox"
                          checked={selectedTradeIds.size === trades.length && trades.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-outline-variant text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                      </th>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium text-center">Side</th>
                      <th className="px-3 py-2 font-medium text-right">Qty</th>
                      <th className="px-3 py-2 font-medium text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {trades.map((trade) => {
                      const isSelected = selectedTradeIds.has(trade.id)
                      const editData = editingTrades.get(trade.id)

                      return (
                        <tr
                          key={trade.id}
                          className={cn(
                            'hover:bg-surface-container-high transition-colors',
                            isSelected && 'bg-primary/5'
                          )}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(trade.id)}
                              className="rounded border-outline-variant text-primary focus:ring-primary w-3.5 h-3.5"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="text-xs font-data text-on-surface">
                              {trade.executed_at.split('T')[1]?.split('.')[0] || ''}
                            </p>
                            {editData ? (
                              <input
                                type="text"
                                value={editData.notes}
                                onChange={(e) => updateEditingTrade(trade.id, 'notes', e.target.value)}
                                placeholder="Notes..."
                                className="mt-1 w-full px-1.5 py-0.5 text-[10px] bg-surface-container-low border border-outline-variant/20 rounded text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            ) : trade.notes ? (
                              <p className="text-[10px] text-outline mt-0.5 truncate max-w-[120px]">{trade.notes}</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <SideBadge side={trade.side} />
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-data text-on-surface">
                            {trade.quantity}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <p className="text-xs font-data text-on-surface">${trade.price.toFixed(2)}</p>
                            {editData ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editData.commission}
                                onChange={(e) => updateEditingTrade(trade.id, 'commission', parseFloat(e.target.value) || 0)}
                                className="mt-1 w-16 px-1.5 py-0.5 text-[10px] text-right bg-surface-container-low border border-outline-variant/20 rounded text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            ) : (
                              <p className="text-[10px] text-outline">${trade.commission.toFixed(2)}</p>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Execution timeline */}
        {trades.length > 1 && (
          <div className="bg-surface-container rounded-xl p-6">
            <h3 className="text-[10px] font-label uppercase tracking-widest text-outline mb-4">Execution Timeline</h3>
            <div className="flex items-center">
              {[...trades]
                .sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime())
                .map((trade, idx, arr) => (
                  <div key={trade.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'w-3 h-3 rounded-full border-2',
                        trade.side === 'BUY'
                          ? 'bg-secondary-container border-secondary-container'
                          : 'bg-tertiary-container border-tertiary-container'
                      )} />
                      <div className="mt-2 text-center">
                        <p className="text-[10px] font-bold text-on-surface">{trade.side} {trade.quantity}</p>
                        <p className="text-[10px] text-outline">${trade.price.toFixed(2)}</p>
                        <p className="text-[9px] text-outline/60">
                          {trade.executed_at.split('T')[1]?.split('.')[0] || ''}
                        </p>
                      </div>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="flex-1 h-px border-t border-dashed border-outline-variant/30 mx-2" />
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
