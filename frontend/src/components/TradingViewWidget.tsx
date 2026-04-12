import { useEffect, useRef, useState, memo, useCallback } from 'react'
import { getChartColors } from '@/lib/chartColors'

interface TradingViewWidgetProps {
  symbol: string
  defaultInterval?: string
  theme?: 'light' | 'dark'
  minHeight?: number
  defaultHeight?: number
}

declare global {
  interface Window {
    TradingView: any
  }
}

const INTERVALS = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '30', label: '30m' },
  { value: '60', label: '1H' },
  { value: 'D', label: 'D' },
  { value: 'W', label: 'W' },
]

function TradingViewWidgetComponent({
  symbol,
  defaultInterval = '1',
  theme = 'dark',
  minHeight = 400,
  defaultHeight = 600,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  const [interval, setInterval] = useState(defaultInterval)
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

      // Create widget
      widgetRef.current = new window.TradingView.widget({
        symbol: currentSymbol,
        interval: interval,
        timezone: 'Asia/Shanghai',
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
  }, [currentSymbol, interval, theme, height])

  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval)
  }

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
      {/* Custom Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-outline-variant/10 bg-surface-container">
        <div className="flex items-center gap-3">
          <span className="text-on-surface font-semibold text-sm">{currentSymbol}</span>
          <span className="text-outline text-[10px] font-label uppercase tracking-wider">TradingView</span>
        </div>

        {/* Interval Selector */}
        <div className="flex items-center gap-0.5 bg-surface-container-low rounded-lg p-1">
          {INTERVALS.map((int) => (
            <button
              key={int.value}
              onClick={() => handleIntervalChange(int.value)}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                interval === int.value
                  ? 'bg-primary text-on-primary'
                  : 'text-outline hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {int.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
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
