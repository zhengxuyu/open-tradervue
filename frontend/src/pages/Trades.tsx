import { useEffect, useState, useRef, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { getPositions, deletePositions, type Position } from '@/services/api'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Filter, Trash2 } from 'lucide-react'
import { formatCurrency, cn, getPnLColor } from '@/lib/utils'

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
  const [showFilters, setShowFilters] = useState(false)
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trades</h1>
          <p className="text-gray-500 mt-1">View your trade records</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Link to="/import">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Import Trades
            </Button>
          </Link>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="py-4">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={filters.symbol}
                  onChange={(e) => setFilters({ ...filters, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g. AAPL"
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as '' | 'open' | 'closed' })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="closed">Closed</option>
                  <option value="open">Open</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => setFilters({ symbol: '', status: 'closed' })}
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilters({ ...filters, status: 'closed' })}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filters.status === 'closed'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          Closed ({closedCount})
        </button>
        <button
          onClick={() => setFilters({ ...filters, status: 'open' })}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filters.status === 'open'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setFilters({ ...filters, status: '' })}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filters.status === ''
              ? 'bg-gray-700 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          All
        </button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {filters.status === 'closed' ? 'Closed Trades' :
               filters.status === 'open' ? 'Open Positions' :
               'All Trades'} ({positions.length})
            </CardTitle>
            {hasSelection && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {selectedIds.size} selected
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : groupedPositions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {filters.status === 'open'
                ? 'No open positions'
                : 'No trades found. Import your trades to get started.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === positions.length && positions.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Entry
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Exit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P&L
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      %
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trades
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupedPositions.map((group) => {
                    const isHighlighted = group.positionIds.includes(highlightedId || 0)
                    const isSelected = group.positionIds.every(id => selectedIds.has(id))
                    const isPartialSelected = group.positionIds.some(id => selectedIds.has(id)) && !isSelected

                    return (
                      <tr
                        key={group.key}
                        ref={isHighlighted ? highlightedRowRef : null}
                        className={cn(
                          'hover:bg-gray-50 cursor-pointer transition-colors duration-300',
                          isHighlighted && 'bg-yellow-100 hover:bg-yellow-100',
                          isSelected && 'bg-blue-50',
                          isPartialSelected && 'bg-blue-50/50'
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
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {group.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">
                            {group.symbol}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={cn(
                              'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                              group.status === 'open'
                                ? 'bg-blue-100 text-blue-800'
                                : group.status === 'mixed'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            )}
                          >
                            {group.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {group.totalQuantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(group.avgEntryPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {group.avgExitPrice ? formatCurrency(group.avgExitPrice) : '-'}
                        </td>
                        <td className={cn(
                          'px-6 py-4 whitespace-nowrap text-sm font-medium text-right',
                          group.totalPnl !== null ? getPnLColor(group.totalPnl) : 'text-gray-400'
                        )}>
                          {group.totalPnl !== null ? formatCurrency(group.totalPnl) : '-'}
                        </td>
                        <td className={cn(
                          'px-6 py-4 whitespace-nowrap text-sm font-medium text-right',
                          group.pnlPercent !== null ? getPnLColor(group.pnlPercent) : 'text-gray-400'
                        )}>
                          {group.pnlPercent !== null ? `${group.pnlPercent >= 0 ? '+' : ''}${group.pnlPercent.toFixed(2)}%` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {group.tradeCount}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
