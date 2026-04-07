import type { Trade } from '@/services/api'
import { SideBadge } from './Badge'
import { formatDate, formatTime } from '@/lib/utils'

interface TradeTableProps {
  trades: Trade[]
  compact?: boolean
}

export function TradeTable({ trades, compact = false }: TradeTableProps) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-outline text-sm">No trades found</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-surface-container-low text-[10px] font-label uppercase tracking-widest text-outline">
          <tr>
            <th className="px-6 py-4 font-medium">Date / Time</th>
            <th className="px-6 py-4 font-medium">Symbol</th>
            <th className="px-6 py-4 font-medium text-center">Side</th>
            <th className="px-6 py-4 font-medium text-right">Quantity</th>
            <th className="px-6 py-4 font-medium text-right">Price</th>
            {!compact && <th className="px-6 py-4 font-medium text-right">Commission</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10">
          {trades.map((trade) => (
            <tr key={trade.id} className="hover:bg-surface-container-high transition-colors">
              <td className="px-6 py-4">
                <p className="text-xs font-semibold text-white">{formatDate(trade.executed_at)}</p>
                <p className="text-[10px] font-label text-outline uppercase">
                  {formatTime(trade.executed_at)}
                </p>
              </td>
              <td className="px-6 py-4">
                <span className="text-xs font-data font-bold text-primary">{trade.symbol}</span>
              </td>
              <td className="px-6 py-4 text-center">
                <SideBadge side={trade.side} />
              </td>
              <td className="px-6 py-4 text-right font-data text-xs text-white">
                {trade.quantity.toLocaleString()}
              </td>
              <td className="px-6 py-4 text-right font-data text-xs text-white">
                ${trade.price.toFixed(2)}
              </td>
              {!compact && (
                <td className="px-6 py-4 text-right font-data text-xs text-outline">
                  ${trade.commission.toFixed(2)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
