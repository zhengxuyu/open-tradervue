import { useEffect, useRef, useState, memo, useCallback } from 'react'
// TradingView's built-in toolbar handles interval/symbol changes natively
import { getChartColors } from '@/lib/chartColors'

interface TradingViewWidgetProps {
  symbol: string
  defaultInterval?: string
  theme?: 'light' | 'dark'
  minHeight?: number
  defaultHeight?: number
  focusTime?: string  // ISO datetime string — chart scrolls to this time on load
}

declare global {
  interface Window {
    TradingView: any
  }
}

function TradingViewWidgetComponent({
  symbol,
  defaultInterval = '1',
  theme = 'dark',
  minHeight = 400,
  defaultHeight = 600,
  focusTime,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  const [currentSymbol, setCurrentSymbol] = useState(symbol)
  const [height, setHeight] = useState(defaultHeight)
  const [isResizing, setIsResizing] = useState(false)

  // Update symbol when prop changes
  useEffect(() => {
    if (symbol !== currentSymbol) {
      setCurrentSymbol(symbol)
    }
  }, [symbol])

  useEffect(() => {
    // Load TradingView script if not already loaded
    const scriptId = 'tradingview-widget-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    const initWidget = () => {
      if (!containerRef.current || !window.TradingView) return

      const colors = getChartColors()
      const isDark = document.documentElement.classList.contains('dark')

      // Clear previous widget
      containerRef.current.innerHTML = ''

      // Create unique container id
      const containerId = `tv_chart_${Date.now()}`
      const chartDiv = document.createElement('div')
      chartDiv.id = containerId
      chartDiv.style.height = '100%'
      containerRef.current.appendChild(chartDiv)

      // Calculate focus range if focusTime is provided
      let focusFrom: number | null = null
      let focusTo: number | null = null
      if (focusTime) {
        const focusSec = Math.floor(new Date(focusTime).getTime() / 1000)
        // Show ~2 hours around the focus time
        focusFrom = focusSec - 3600
        focusTo = focusSec + 3600
      }

      // Create widget
      widgetRef.current = new window.TradingView.widget({
        symbol: currentSymbol,
        interval: defaultInterval,
        timezone: 'America/New_York',
        theme: isDark ? 'dark' : 'light',
        style: '1', // Candlestick
        locale: 'zh_CN',
        toolbar_bg: colors.surface,
        enable_publishing: false,
        allow_symbol_change: true,
        save_image: true,
        container_id: containerId,
        autosize: false,
        height: height,
        width: '100%',
        hide_side_toolbar: false,
        hide_top_toolbar: false,
        studies: [
          'MASimple@tv-basicstudies',
          'Volume@tv-basicstudies',
        ],
        disabled_features: [
          'header_compare',
          'compare_symbol',
        ],
        enabled_features: [
          'study_templates',
          'use_localstorage_for_settings',
          'save_chart_properties_to_local_storage',
        ],
        overrides: {
          'paneProperties.background': colors.surface,
          'paneProperties.backgroundType': 'solid',
          'paneProperties.vertGridProperties.color': colors.grid,
          'paneProperties.horzGridProperties.color': colors.grid,
          'mainSeriesProperties.candleStyle.upColor': colors.profitContainer,
          'mainSeriesProperties.candleStyle.downColor': colors.lossContainer,
          'mainSeriesProperties.candleStyle.borderUpColor': colors.profitContainer,
          'mainSeriesProperties.candleStyle.borderDownColor': colors.lossContainer,
          'mainSeriesProperties.candleStyle.wickUpColor': colors.profitContainer,
          'mainSeriesProperties.candleStyle.wickDownColor': colors.lossContainer,
          'scalesProperties.textColor': colors.textMuted,
          'scalesProperties.lineColor': colors.grid,
        },
        loading_screen: {
          backgroundColor: colors.surface,
          foregroundColor: colors.primary,
        },
      })

      // Scroll to focus time after chart is ready
      if (focusFrom !== null && focusTo !== null && widgetRef.current.onChartReady) {
        const from = focusFrom
        const to = focusTo
        widgetRef.current.onChartReady(() => {
          try {
            widgetRef.current.chart().setVisibleRange({
              from,
              to,
            })
          } catch (e) {
            console.warn('Failed to set visible range:', e)
          }
        })
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://s3.tradingview.com/tv.js'
      script.async = true
      script.onload = initWidget
      document.head.appendChild(script)
    } else if (window.TradingView) {
      initWidget()
    } else {
      script.addEventListener('load', initWidget)
    }

    return () => {
      if (widgetRef.current) {
        widgetRef.current = null
      }
    }
  }, [currentSymbol, defaultInterval, theme, height])

  // Resize handlers - vertical only
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
      {/* Chart Container — TradingView's built-in toolbar handles interval selection */}
      <div
        ref={containerRef}
        style={{ height: `${height}px` }}
      />

      {/* Resize Handle - Bottom */}
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
