interface TopAppBarProps {
  title: string
  actions?: React.ReactNode
}

export function TopAppBar({ title, actions }: TopAppBarProps) {
  return (
    <header className="w-full h-16 sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="font-headline font-semibold text-sm uppercase tracking-widest text-primary">
          {title}
        </h2>
      </div>
      {actions && (
        <div className="flex items-center gap-4">
          {actions}
        </div>
      )}
    </header>
  )
}
