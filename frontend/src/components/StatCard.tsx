import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  subLabel?: string
  subValue?: string
  accentColor?: 'secondary' | 'tertiary' | 'primary'
  className?: string
  children?: React.ReactNode
}

export function StatCard({
  label,
  value,
  subLabel,
  subValue,
  accentColor,
  className,
  children,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-surface-container p-5 rounded-xl relative overflow-hidden',
        accentColor && `border-l-2 border-${accentColor}`,
        className
      )}
    >
      <div className="text-[10px] font-label uppercase tracking-widest text-outline mb-2">
        {label}
      </div>
      <div className={cn(
        'text-xl font-bold font-data tabular-nums',
        accentColor ? `text-${accentColor}` : 'text-on-surface'
      )}>
        {value}
      </div>
      {subLabel && (
        <div className="mt-2 text-[10px] font-label text-outline uppercase tracking-wider">
          {subLabel}: {subValue}
        </div>
      )}
      {children}
    </div>
  )
}
