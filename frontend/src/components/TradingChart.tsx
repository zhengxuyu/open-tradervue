import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, ColorType, CrosshairMode, type IChartApi, type ISeriesApi, type CandlestickData, type Time, type SeriesMarker } from 'lightweight-charts'
import type { KlineData } from '@/services/api'
import { getKline } from '@/services/api'
import { Icon } from './Icon'

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
  { value: '1min', label: '1m' },
  { value: '5min', label: '5m' },
  { value: '15min', label: '15m' },
  { value: '30min', label: '30m' },
  { value: '60min', label: '1H' },
  { value: 'daily', label: 'D' },
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

    // Create chart with dark theme
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#080a09' },
        textColor: '#525252',
      },
      grid: {
        vertLines: { color: 'rgba(65, 71, 83, 0.15)' },
        horzLines: { color: 'rgba(65, 71, 83, 0.15)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: containerHeight,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: '#10b981',
          style: 2,
          labelBackgroundColor: '#10b981',
        },
        horzLine: {
          width: 1,
          color: '#10b981',
          style: 2,
          labelBackgroundColor: '#10b981',
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: interval === '1min',
        borderColor: 'rgba(65, 71, 83, 0.15)',
        rightOffset: 10,
        barSpacing: 8,
        minBarSpacing: 2,
      },
      rightPriceScale: {
        borderColor: 'rgba(65, 71, 83, 0.15)',
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

    // Add candlestick series with design tokens
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#059669',
      downColor: '#ef4444',
      borderUpColor: '#059669',
      borderDownColor: '#ef4444',
      wickUpColor: '#059669',
      wickDownColor: '#ef4444',
    })

    seriesRef.current = candlestickSeries

    // Prepare and set chart data
    const chartData: CandlestickData<Time>[] = klines.map(k => {
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

    // Add volume series with themed colors
    const volumeSeries = chart.addHistogramSeries({
      color: 'rgba(30, 162, 150, 0.3)',
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
        color: k.close >= k.open ? 'rgba(30, 162, 150, 0.3)' : 'rgba(255, 103, 98, 0.3)',
      }
    })

    volumeSeries.setData(volumeData)

    // Add markers for trades
    if (trades.length > 0) {
      const intervalSeconds: Record<string, number> = {
        '1min': 60,
        '5min': 300,
        '15min': 900,
        '30min': 1800,
        '60min': 3600,
      }
      const step = intervalSeconds[interval] || 60

      const markers: SeriesMarker<Time>[] = trades.map(trade => {
        const timeValue = interval === 'daily'
          ? trade.time.split('T')[0]
          : Math.floor(new Date(trade.time).getTime() / 1000 / step) * step

        return {
          time: timeValue as Time,
          position: trade.side === 'BUY' ? 'belowBar' as const : 'aboveBar' as const,
          color: trade.side === 'BUY' ? '#059669' : '#ef4444',
          shape: trade.side === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const,
          text: `${trade.side} ${trade.quantity}@${trade.price.toFixed(2)}`,
          size: 2,
        }
      })

      markers.sort((a, b) => {
        const aTime = typeof a.time === 'number' ? a.time : new Date(a.time as string).getTime()
        const bTime = typeof b.time === 'number' ? b.time : new Date(b.time as string).getTime()
        return aTime - bTime
      })

      candlestickSeries.setMarkers(markers)
    }

    // Focus on first buy trade if exists
    const firstBuyTrade = trades.find(t => t.side === 'BUY')
    if (firstBuyTrade && chartData.length > 0) {
      const buyTimestamp = Math.floor(new Date(firstBuyTrade.time).getTime() / 1000)

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

  // Resize handler
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
    <div className={`bg-surface rounded-xl border border-outline-variant/10 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10 bg-surface-container">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-on-surface">{symbol}</h3>

          {/* Interval Selector */}
          <div className="flex items-center gap-0.5 bg-surface-container-low rounded-lg p-1">
            {INTERVALS.map((int) => (
              <button
                key={int.value}
                onClick={() => setInterval(int.value)}
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

        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] font-label text-outline mr-3">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 bg-secondary-container rounded-sm" />
              <span>Buy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 bg-tertiary-container rounded-sm" />
              <span>Sell</span>
            </div>
          </div>

          {/* Reset Zoom */}
          <button
            onClick={resetZoom}
            className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
            title="Reset zoom"
          >
            <Icon name="fit_screen" className="text-[18px]" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} className="text-[18px]" />
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-10">
            <div className="text-outline text-sm">Loading chart data...</div>
          </div>
        )}
        <div ref={chartContainerRef} />
      </div>

      {/* Trade Markers Legend */}
      {trades.length > 0 && (
        <div className="px-4 py-3 border-t border-outline-variant/10">
          <p className="text-[10px] font-label uppercase tracking-widest text-outline mb-2">Trade Executions</p>
          <div className="flex flex-wrap gap-2">
            {[...trades].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).map(trade => (
              <span
                key={trade.id}
                className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-medium ${
                  trade.side === 'BUY'
                    ? 'bg-secondary-container/10 text-secondary-container border border-secondary-container/20'
                    : 'bg-tertiary-container/10 text-tertiary-container border border-tertiary-container/20'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${trade.side === 'BUY' ? 'bg-secondary-container' : 'bg-tertiary-container'}`} />
                {trade.side} {trade.quantity} @ ${trade.price.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resize Handle */}
      <div className="relative">
        <div
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
