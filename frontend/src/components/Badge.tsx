import { cn } from '@/lib/utils'

interface BadgeProps {
  side: 'BUY' | 'SELL'
  className?: string
}

export function SideBadge({ side, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
        side === 'BUY'
          ? 'bg-secondary-container text-on-secondary-container'
          : 'bg-tertiary-container text-on-tertiary-container',
        className
      )}
    >
      {side}
    </span>
  )
}

interface PnLValueProps {
  value: number
  className?: string
  showSign?: boolean
}

export function PnLValue({ value, className, showSign = true }: PnLValueProps) {
  const color = value > 0 ? 'text-secondary' : value < 0 ? 'text-tertiary' : 'text-outline'
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(value))
  const prefix = showSign ? (value >= 0 ? '+' : '-') : (value < 0 ? '-' : '')

  return (
    <span className={cn('font-data tabular-nums font-bold', color, className)}>
      {prefix}${formatted.replace('$', '')}
    </span>
  )
}
