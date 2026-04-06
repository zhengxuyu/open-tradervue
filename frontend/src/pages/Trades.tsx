import { useEffect, useState, useRef, useMemo } from 'react'
import { getPositions, deletePositions, type Position } from '@/services/api'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { formatCurrency, cn, getPnLColor } from '@/lib/utils'
import { TopAppBar } from '@/components/TopAppBar'
import { Icon } from '@/components/Icon'
import { PnLValue } from '@/components/Badge'

// Group positions by symbol + date
interface GroupedPosition {
  key: string  // symbol_date
  symbol: string
  date: string
  status: 'open' | 'closed' | 'mixed'
  totalQuantity: number
  avgEntryPrice: number
  avgExitPrice: number | null
  totalPnl: number | null
  pnlPercent: number | null
  positionIds: number[]
  tradeCount: number
}

export function Trades() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    symbol: '',
    status: 'closed' as '' | 'open' | 'closed',
  })
  const [highlightedId, setHighlightedId] = useState<number | null>(null)
  const highlightedRowRef = useRef<HTMLTableRowElement>(null)

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchPositions = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filters.symbol) params.symbol = filters.symbol
      if (filters.status) params.status = filters.status

      const data = await getPositions(params)
      setPositions(data)
    } catch (error) {
      console.error('Failed to fetch positions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle URL parameters on initial load
  useEffect(() => {
    const highlightParam = searchParams.get('highlight')

    if (highlightParam) {
      setHighlightedId(parseInt(highlightParam, 10))
    }
  }, [])

  useEffect(() => {
    fetchPositions()
  }, [filters])

  // Scroll to highlighted row when positions load and highlighted ID is set
  useEffect(() => {
    if (highlightedId && !loading && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // Clear highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightedId(null)
        // Clean URL params
        searchParams.delete('date')
        searchParams.delete('highlight')
        setSearchParams(searchParams)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [highlightedId, loading, positions])

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [filters])

  const toggleSelectAll = () => {
    const allIds = groupedPositions.flatMap(g => g.positionIds)
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const toggleSelectGroup = (positionIds: number[], e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelected = new Set(selectedIds)
    const allSelected = positionIds.every(id => newSelected.has(id))

    if (allSelected) {
      positionIds.forEach(id => newSelected.delete(id))
    } else {
      positionIds.forEach(id => newSelected.add(id))
    }
    setSelectedIds(newSelected)
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedIds.size} trade(s)? This will delete all associated buy/sell records.`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deletePositions(Array.from(selectedIds))
      setSelectedIds(new Set())
      await fetchPositions()
    } catch (error) {
      console.error('Failed to delete positions:', error)
      alert('Failed to delete trades')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRowClick = (group: GroupedPosition) => {
    // Navigate to daily position detail with symbol and date
    navigate(`/positions/daily?symbol=${group.symbol}&date=${group.date}`)
  }

  // Group positions by symbol + date
  const groupedPositions = useMemo(() => {
    const groups = new Map<string, GroupedPosition>()

    positions.forEach(pos => {
      const date = pos.entry_time.split('T')[0]
      const key = `${pos.symbol}_${date}`

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          symbol: pos.symbol,
          date,
          status: pos.status,
          totalQuantity: 0,
          avgEntryPrice: 0,
          avgExitPrice: null,
          totalPnl: null,
          pnlPercent: null,
          positionIds: [],
          tradeCount: 0,
        })
      }

      const group = groups.get(key)!
      group.positionIds.push(pos.id)
      group.totalQuantity += pos.quantity
      group.tradeCount += 1

      // Weighted average entry price
      const prevTotal = group.avgEntryPrice * (group.totalQuantity - pos.quantity)
      group.avgEntryPrice = (prevTotal + pos.entry_price * pos.quantity) / group.totalQuantity

      // Status: if any open, show mixed; otherwise closed
      if (pos.status === 'open' && group.status === 'closed') {
        group.status = 'mixed'
      } else if (pos.status === 'closed' && group.status === 'open') {
        group.status = 'mixed'
      }

      // Sum P&L
      if (pos.pnl !== null) {
        group.totalPnl = (group.totalPnl || 0) + pos.pnl
      }

      // Exit price (weighted average for closed)
      if (pos.exit_price !== null) {
        if (group.avgExitPrice === null) {
          group.avgExitPrice = pos.exit_price
        } else {
          // Simple average for now
          const closedCount = group.positionIds.filter(id =>
            positions.find(p => p.id === id)?.exit_price !== null
          ).length
          group.avgExitPrice = ((group.avgExitPrice * (closedCount - 1)) + pos.exit_price) / closedCount
        }
      }
    })

    // Calculate P&L percent for each group
    groups.forEach(group => {
      if (group.totalPnl !== null && group.avgEntryPrice > 0) {
        const totalCost = group.avgEntryPrice * group.totalQuantity
        group.pnlPercent = (group.totalPnl / totalCost) * 100
      }
    })

    return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date))
  }, [positions])

  const closedCount = positions.filter(p => p.status === 'closed').length
  const openCount = positions.filter(p => p.status === 'open').length
  const hasSelection = selectedIds.size > 0

  return (
    <div className="flex flex-col h-full">
      <TopAppBar
        title="Trades"
        actions={
          <Link to="/import">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-colors">
              <Icon name="upload" className="text-base" />
              Import
            </button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        {/* Filter section */}
        <div className="bg-surface-container-low rounded-xl p-4 flex flex-wrap items-center gap-4">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg" />
            <input
              type="text"
              value={filters.symbol}
              onChange={(e) => setFilters({ ...filters, symbol: e.target.value.toUpperCase() })}
              placeholder="Search symbol..."
              className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-lg text-sm text-on-surface placeholder:text-outline border border-outline-variant/10 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>

          {/* Side toggle */}
          <div className="bg-surface-container rounded-lg p-1 flex">
            <button
              onClick={() => setFilters({ ...filters, status: '' })}
              className={cn(
                'px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors',
                filters.status === ''
                  ? 'bg-primary text-on-primary'
                  : 'text-outline hover:text-on-surface'
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilters({ ...filters, status: 'closed' })}
              className={cn(
                'px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors',
                filters.status === 'closed'
                  ? 'bg-primary text-on-primary'
                  : 'text-outline hover:text-on-surface'
              )}
            >
              Closed ({closedCount})
            </button>
            <button
              onClick={() => setFilters({ ...filters, status: 'open' })}
              className={cn(
                'px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors',
                filters.status === 'open'
                  ? 'bg-primary text-on-primary'
                  : 'text-outline hover:text-on-surface'
              )}
            >
              Open ({openCount})
            </button>
          </div>

          {/* Delete button */}
          {hasSelection && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-tertiary-container text-on-tertiary-container text-sm font-medium hover:bg-tertiary-container/80 transition-colors disabled:opacity-50"
            >
              <Icon name="delete" className="text-base" />
              {isDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
            </button>
          )}
        </div>

        {/* Data table */}
        <div className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-outline">Loading...</div>
          ) : groupedPositions.length === 0 ? (
            <div className="text-center py-16 text-outline">
              {filters.status === 'open'
                ? 'No open positions'
                : 'No trades found. Import your trades to get started.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-outline-variant/10">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === positions.length && positions.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-outline-variant/30 bg-surface-container text-primary focus:ring-primary/40"
                      />
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-label uppercase tracking-widest text-outline">
                      Date
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-label uppercase tracking-widest text-outline">
                      Symbol
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-label uppercase tracking-widest text-outline">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-label uppercase tracking-widest text-outline">
                      Qty
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-label uppercase tracking-widest text-outline">
                      Avg Entry
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-label uppercase tracking-widest text-outline">
                      Avg Exit
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-label uppercase tracking-widest text-outline">
                      P&L
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-label uppercase tracking-widest text-outline">
                      %
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-label uppercase tracking-widest text-outline">
                      Trades
                    </th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {groupedPositions.map((group) => {
                    const isHighlighted = group.positionIds.includes(highlightedId || 0)
                    const isSelected = group.positionIds.every(id => selectedIds.has(id))
                    const isPartialSelected = group.positionIds.some(id => selectedIds.has(id)) && !isSelected

                    return (
                      <tr
                        key={group.key}
                        ref={isHighlighted ? highlightedRowRef : null}
                        className={cn(
                          'hover:bg-surface-container-high/40 transition-colors group cursor-pointer border-b border-outline-variant/5',
                          isHighlighted && 'border-l-2 border-l-primary bg-surface-container-high/20',
                          isSelected && 'bg-primary/5',
                          isPartialSelected && 'bg-primary/3'
                        )}
                        onClick={() => handleRowClick(group)}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            ref={el => {
                              if (el) el.indeterminate = isPartialSelected
                            }}
                            onChange={() => {}}
                            onClick={(e) => toggleSelectGroup(group.positionIds, e)}
                            className="rounded border-outline-variant/30 bg-surface-container text-primary focus:ring-primary/40"
                          />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-data tabular-nums text-on-surface-variant">
                          {group.date}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-data font-bold text-primary">
                            {group.symbol}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={cn(
                              'inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded',
                              group.status === 'open'
                                ? 'bg-primary/10 text-primary'
                                : group.status === 'mixed'
                                ? 'bg-tertiary-container/30 text-tertiary'
                                : 'bg-surface-container text-outline'
                            )}
                          >
                            {group.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-data tabular-nums text-on-surface-variant text-right">
                          {group.totalQuantity}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-data tabular-nums text-on-surface-variant text-right">
                          {formatCurrency(group.avgEntryPrice)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-data tabular-nums text-on-surface-variant text-right">
                          {group.avgExitPrice ? formatCurrency(group.avgExitPrice) : '-'}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          {group.totalPnl !== null ? (
                            <PnLValue value={group.totalPnl} />
                          ) : (
                            <span className="text-outline text-sm">-</span>
                          )}
                        </td>
                        <td className={cn(
                          'px-5 py-4 whitespace-nowrap text-sm font-data tabular-nums font-bold text-right',
                          group.pnlPercent !== null ? getPnLColor(group.pnlPercent) : 'text-outline'
                        )}>
                          {group.pnlPercent !== null ? `${group.pnlPercent >= 0 ? '+' : ''}${group.pnlPercent.toFixed(2)}%` : '-'}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-data tabular-nums text-outline text-right">
                          {group.tradeCount}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const ids = group.positionIds
                              setSelectedIds(new Set(ids))
                            }}
                            className="opacity-0 group-hover:opacity-100 text-outline hover:text-tertiary transition-all"
                          >
                            <Icon name="delete" className="text-lg" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
