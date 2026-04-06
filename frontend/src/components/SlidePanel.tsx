import { Icon } from './Icon'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function SlidePanel({ open, onClose, title, children, footer }: SlidePanelProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-surface/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-surface-container-low h-full shadow-2xl flex flex-col border-l border-outline-variant/20">
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container">
          <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
          <button onClick={onClose} className="text-outline hover:text-white transition-colors">
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          {children}
        </div>
        {footer && (
          <div className="p-6 border-t border-outline-variant/10 flex items-center gap-4 bg-surface-container-low">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
