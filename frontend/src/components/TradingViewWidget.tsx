import { useRef, useState, memo, useCallback } from 'react'

interface TradingViewWidgetProps {
  symbol: string
  defaultInterval?: string
  theme?: 'light' | 'dark'
  minHeight?: number
  defaultHeight?: number
  focusTime?: string  // ISO datetime string — not used by TradingView iframe
}

function TradingViewWidgetComponent({
  symbol,
  defaultInterval = '1',
  theme = 'dark',
  minHeight = 400,
  defaultHeight = 600,
}: TradingViewWidgetProps) {
  const resizeRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(defaultHeight)
  const [isResizing, setIsResizing] = useState(false)

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const tvTheme = isDark ? 'dark' : 'light'

  // Build TradingView Advanced Chart iframe URL
  const src = `https://s.tradingview.com/widgetembed/?` +
    `symbol=${encodeURIComponent(symbol)}` +
    `&interval=${defaultInterval}` +
    `&timezone=America%2FNew_York` +
    `&theme=${tvTheme}` +
    `&style=1` +
    `&locale=zh_CN` +
    `&enable_publishing=0` +
    `&allow_symbol_change=1` +
    `&save_image=1` +
    `&hide_side_toolbar=0` +
    `&hide_top_toolbar=0` +
    `&withdateranges=1` +
    `&studies=MASimple%40tv-basicstudies%21Volume%40tv-basicstudies` +
    `&utm_source=tradejournal.dev`

  // Resize handlers
  const handleVerticalResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startY = e.clientY
    const startHeight = height

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY
      const newHeight = Math.max(minHeight, startHeight + deltaY)
      setHeight(newHeight)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [height, minHeight])

  return (
    <div className="rounded-xl overflow-hidden border border-outline-variant/10 bg-surface">
      <iframe
        src={src}
        style={{ width: '100%', height: `${height}px`, border: 'none' }}
        allowFullScreen
      />

      {/* Resize Handle */}
      <div className="relative">
        <div
          ref={resizeRef}
          onMouseDown={handleVerticalResize}
          className={`h-2.5 cursor-ns-resize flex items-center justify-center transition-colors ${
            isResizing ? 'bg-primary/20' : 'bg-surface-container hover:bg-surface-container-high'
          }`}
        >
          <div className="w-10 h-0.5 bg-outline-variant/30 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export const TradingViewWidget = memo(TradingViewWidgetComponent)
