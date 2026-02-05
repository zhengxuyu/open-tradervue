import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, ColorType, CrosshairMode, type IChartApi, type ISeriesApi, type CandlestickData, type Time, type SeriesMarker } from 'lightweight-charts'
import type { KlineData } from '@/services/api'
import { getKline } from '@/services/api'

interface TradeMarker {
  id: number
  time: string
  side: string
  price: number
  quantity: number
}

interface TradingChartProps {
  symbol: string
  klines?: KlineData[]
  trades?: TradeMarker[]
  defaultInterval?: string
  defaultHeight?: number
  minHeight?: number
}

const INTERVALS = [
  { value: '1min', label: '1分钟' },
  { value: '5min', label: '5分钟' },
  { value: '15min', label: '15分钟' },
  { value: '30min', label: '30分钟' },
  { value: '60min', label: '1小时' },
  { value: 'daily', label: '日线' },
]

export function TradingChart({ symbol, klines: initialKlines, trades = [], defaultInterval = '5min', defaultHeight = 500, minHeight = 300 }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  const [interval, setInterval] = useState(defaultInterval)
  const [klines, setKlines] = useState<KlineData[]>(initialKlines || [])
  const [loading, setLoading] = useState(!initialKlines)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [height, setHeight] = useState(defaultHeight)
  const [isResizing, setIsResizing] = useState(false)

  // Fetch K-line data when interval changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await getKline({ symbol, interval })
        setKlines(data)
      } catch (error) {
        console.error('Failed to fetch K-line data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [symbol, interval])

  // Create and update chart
  useEffect(() => {
    if (!chartContainerRef.current || klines.length === 0) return

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      seriesRef.current = null
    }

    const containerHeight = isFullscreen ? window.innerHeight - 120 : height

    // Create chart with interactive options
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a2e' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2d2d44' },
        horzLines: { color: '#2d2d44' },
      },
      width: chartContainerRef.current.clientWidth,
      height: containerHeight,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: '#6366f1',
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          width: 1,
          color: '#6366f1',
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: interval === '1min',
        borderColor: '#2d2d44',
        rightOffset: 10,
        barSpacing: 8,
        minBarSpacing: 2,
      },
      rightPriceScale: {
        borderColor: '#2d2d44',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    chartRef.current = chart

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    seriesRef.current = candlestickSeries

    // Prepare and set chart data
    const chartData: CandlestickData<Time>[] = klines.map(k => {
      // For intraday data, use full timestamp; for daily, use date only
      const timeValue = interval === 'daily'
        ? k.timestamp.split('T')[0]
        : Math.floor(new Date(k.timestamp).getTime() / 1000)

      return {
        time: timeValue as Time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }
    })

    candlestickSeries.setData(chartData)

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#6366f1',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    })

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    })

    const volumeData = klines.map(k => {
      const timeValue = interval === 'daily'
        ? k.timestamp.split('T')[0]
        : Math.floor(new Date(k.timestamp).getTime() / 1000)

      return {
        time: timeValue as Time,
        value: k.volume,
        color: k.close >= k.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      }
    })

    volumeSeries.setData(volumeData)

    // Add markers for trades
    if (trades.length > 0) {
      const markers: SeriesMarker<Time>[] = trades.map(trade => {
        const timeValue = interval === 'daily'
          ? trade.time.split('T')[0]
          : Math.floor(new Date(trade.time).getTime() / 1000)

        return {
          time: timeValue as Time,
          position: trade.side === 'BUY' ? 'belowBar' as const : 'aboveBar' as const,
          color: trade.side === 'BUY' ? '#22c55e' : '#ef4444',
          shape: trade.side === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const,
          text: `${trade.side} ${trade.quantity}@${trade.price.toFixed(2)}`,
          size: 2,
        }
      })

      // Sort markers by time
      markers.sort((a, b) => {
        const aTime = typeof a.time === 'number' ? a.time : new Date(a.time as string).getTime()
        const bTime = typeof b.time === 'number' ? b.time : new Date(b.time as string).getTime()
        return aTime - bTime
      })

      candlestickSeries.setMarkers(markers)
    }

    // Focus on first buy trade if exists, otherwise fit all content
    const firstBuyTrade = trades.find(t => t.side === 'BUY')
    if (firstBuyTrade && chartData.length > 0) {
      const buyTimestamp = Math.floor(new Date(firstBuyTrade.time).getTime() / 1000)

      // Find the closest kline to the buy time
      let buyIndex = -1
      let minDiff = Infinity
      chartData.forEach((d, idx) => {
        const dataTime = typeof d.time === 'number' ? d.time : Math.floor(new Date(d.time as string).getTime() / 1000)
        const diff = Math.abs(dataTime - buyTimestamp)
        if (diff < minDiff) {
          minDiff = diff
          buyIndex = idx
        }
      })

      if (buyIndex >= 0) {
        // Show range around the buy point (about 50 bars before and after)
        const barsToShow = 50
        const from = Math.max(0, buyIndex - barsToShow)
        const to = Math.min(chartData.length - 1, buyIndex + barsToShow)

        chart.timeScale().setVisibleLogicalRange({
          from: from,
          to: to
        })
      } else {
        chart.timeScale().fitContent()
      }
    } else {
      chart.timeScale().fitContent()
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newHeight = isFullscreen ? window.innerHeight - 120 : height
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: newHeight,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
      }
    }
  }, [klines, trades, interval, isFullscreen, height])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
  }

  // Resize handlers - vertical
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
    <div className={`bg-[#1a1a2e] rounded-lg border border-gray-700 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white">{symbol}</h3>

          {/* Interval Selector */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            {INTERVALS.map((int) => (
              <button
                key={int.value}
                onClick={() => setInterval(int.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
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

        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-gray-400 mr-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Buy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span>Sell</span>
            </div>
          </div>

          {/* Reset Zoom */}
          <button
            onClick={resetZoom}
            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
          >
            Reset
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e] bg-opacity-80 z-10">
            <div className="text-gray-400">Loading chart data...</div>
          </div>
        )}
        <div ref={chartContainerRef} />
      </div>

      {/* Trade Markers Legend */}
      {trades.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-700">
          <p className="text-xs font-medium text-gray-400 mb-2">Trade Executions:</p>
          <div className="flex flex-wrap gap-2">
            {[...trades].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).map(trade => (
              <span
                key={trade.id}
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  trade.side === 'BUY'
                    ? 'bg-green-900/50 text-green-400 border border-green-700'
                    : 'bg-red-900/50 text-red-400 border border-red-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${trade.side === 'BUY' ? 'bg-green-500' : 'bg-red-500'}`} />
                {trade.side} {trade.quantity} @ ${trade.price.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
        <span className="mr-4">🖱️ Drag to pan</span>
        <span className="mr-4">⚲ Scroll to zoom</span>
        <span>📏 Drag edges to scale</span>
      </div>

      {/* Resize Handle - Bottom */}
      <div className="relative">
        <div
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
