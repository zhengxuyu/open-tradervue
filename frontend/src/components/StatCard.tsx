import { cn, formatCurrency, formatPercent, getPnLColor } from '@/lib/utils'
import { Card, CardContent } from './Card'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  change?: number
  isPnL?: boolean
  isCurrency?: boolean
  isPercent?: boolean
}

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  isPnL = false,
  isCurrency = false,
  isPercent = false,
}: StatCardProps) {
  const displayValue = () => {
    if (typeof value === 'string') return value
    if (isCurrency) return formatCurrency(value)
    if (isPercent) return formatPercent(value)
    return value.toString()
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p
              className={cn(
                'mt-1 text-2xl font-semibold',
                isPnL && typeof value === 'number' ? getPnLColor(value) : 'text-gray-900'
              )}
            >
              {displayValue()}
            </p>
            {change !== undefined && (
              <p
                className={cn(
                  'mt-1 text-sm',
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {change >= 0 ? '+' : ''}
                {change.toFixed(2)}%
              </p>
            )}
          </div>
          {Icon && (
            <div className="rounded-full bg-blue-100 p-3">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
