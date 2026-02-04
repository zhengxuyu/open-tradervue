import { useEffect, useState, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { getPositions, deletePositions, type Position } from '@/services/api'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Filter, Trash2 } from 'lucide-react'
import { formatCurrency, formatDateTime, cn, getPnLColor } from '@/lib/utils'

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
    if (selectedIds.size === positions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(positions.map(p => p.id)))
    }
  }

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
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

  const handleRowClick = (posId: number) => {
    navigate(`/positions/${posId}`)
  }

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
          ) : positions.length === 0 ? (
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
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entry
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P&L
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entry Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exit Time
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {positions.map((pos) => (
                    <tr
                      key={pos.id}
                      ref={pos.id === highlightedId ? highlightedRowRef : null}
                      className={cn(
                        'hover:bg-gray-50 cursor-pointer transition-colors duration-300',
                        pos.id === highlightedId && 'bg-yellow-100 hover:bg-yellow-100',
                        selectedIds.has(pos.id) && 'bg-blue-50'
                      )}
                      onClick={() => handleRowClick(pos.id)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(pos.id)}
                          onChange={() => {}}
                          onClick={(e) => toggleSelect(pos.id, e)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/positions/${pos.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {pos.symbol}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                            pos.status === 'open'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {pos.status === 'open' ? 'OPEN' : 'CLOSED'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {pos.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(pos.entry_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {pos.exit_price ? formatCurrency(pos.exit_price) : '-'}
                      </td>
                      <td className={cn(
                        'px-6 py-4 whitespace-nowrap text-sm font-medium text-right',
                        pos.pnl !== null ? getPnLColor(pos.pnl) : 'text-gray-400'
                      )}>
                        {pos.pnl !== null ? formatCurrency(pos.pnl) : '-'}
                      </td>
                      <td className={cn(
                        'px-6 py-4 whitespace-nowrap text-sm font-medium text-right',
                        pos.pnl_percent !== null ? getPnLColor(pos.pnl_percent) : 'text-gray-400'
                      )}>
                        {pos.pnl_percent !== null ? `${pos.pnl_percent >= 0 ? '+' : ''}${pos.pnl_percent.toFixed(2)}%` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(pos.entry_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pos.exit_time ? formatDateTime(pos.exit_time) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {pos.holding_days !== null ? pos.holding_days : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
