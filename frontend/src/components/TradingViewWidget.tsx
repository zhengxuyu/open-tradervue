import { useEffect, useRef, useState, memo, useCallback } from 'react'

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
  { value: '1', label: '1分' },
  { value: '5', label: '5分' },
  { value: '15', label: '15分' },
  { value: '30', label: '30分' },
  { value: '60', label: '1时' },
  { value: 'D', label: '日线' },
  { value: 'W', label: '周线' },
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
        theme: theme,
        style: '1', // Candlestick
        locale: 'zh_CN',
        toolbar_bg: theme === 'dark' ? '#1e1e2d' : '#f1f3f6',
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
          'mainSeriesProperties.candleStyle.upColor': '#22c55e',
          'mainSeriesProperties.candleStyle.downColor': '#ef4444',
          'mainSeriesProperties.candleStyle.borderUpColor': '#22c55e',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
          'mainSeriesProperties.candleStyle.wickUpColor': '#22c55e',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
        },
        loading_screen: {
          backgroundColor: theme === 'dark' ? '#1e1e2d' : '#ffffff',
          foregroundColor: theme === 'dark' ? '#6366f1' : '#2962FF',
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

  // Resize handlers - diagonal (corner)
  const handleDiagonalResize = useCallback((e: React.MouseEvent) => {
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
    <div className="rounded-lg overflow-hidden border border-gray-700 bg-[#1e1e2d]">
      {/* Custom Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-[#1e1e2d]">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">{currentSymbol}</span>
          <span className="text-gray-500 text-sm">TradingView</span>
        </div>

        {/* Interval Selector */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          {INTERVALS.map((int) => (
            <button
              key={int.value}
              onClick={() => handleIntervalChange(int.value)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                interval === int.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
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
          className={`h-3 cursor-ns-resize flex items-center justify-center transition-colors ${
            isResizing ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          <div className="w-12 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Diagonal Resize Handle - Bottom Right Corner */}
        <div
          onMouseDown={handleDiagonalResize}
          className={`absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end ${
            isResizing ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
          }`}
          title="Drag to resize"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="currentColor"
            className="mr-0.5 mb-0.5"
          >
            <path d="M9 9H7v-2h2v2zm0-4H5v-2h2v2h2v2zm0-4H3v-2h2v2h2v2h2v2z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export const TradingViewWidget = memo(TradingViewWidgetComponent)
