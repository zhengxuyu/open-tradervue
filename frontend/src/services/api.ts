import axios from 'axios'
import { getToken } from './auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tradervue_token')
      localStorage.removeItem('tradervue_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export interface Trade {
  id: number
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  executed_at: string
  commission: number
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string | null
}

export interface Position {
  id: number
  symbol: string
  entry_price: number
  exit_price: number | null
  quantity: number
  pnl: number | null
  pnl_percent: number | null
  entry_time: string
  exit_time: string | null
  holding_days: number | null
  status: 'open' | 'closed'
  created_at?: string
  updated_at?: string | null
}

export interface PositionDetail extends Omit<Position, 'created_at' | 'updated_at'> {
  total_commission: number
  trades: Trade[]
  entry_trade_ids: number[]
  exit_trade_ids: number[]
}

export interface AnalysisSummary {
  total_trades: number
  total_pnl: number
  total_commission: number
  net_pnl: number
  win_count: number
  loss_count: number
  win_rate: number
  avg_win: number
  avg_loss: number
  profit_factor: number
  max_drawdown: number
  best_trade: number
  worst_trade: number
}

export interface SymbolAnalysis {
  symbol: string
  total_trades: number
  total_pnl: number
  win_rate: number
  avg_pnl: number
}

export interface DateAnalysis {
  date: string
  total_pnl: number
  trade_count: number
  win_count: number
  loss_count: number
}

export interface CalendarDay {
  date: string
  pnl: number
  trade_count: number
  positions_closed: number
}

export interface MonthSummary {
  year: number
  month: number
  total_pnl: number
  trading_days: number
  winning_days: number
  losing_days: number
  best_day: number
  worst_day: number
}

export interface YearSummary {
  year: number
  total_pnl: number
  trading_days: number
  winning_days: number
  losing_days: number
  winning_months: number
  losing_months: number
}

export interface KlineData {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Advanced Statistics Types
export interface HourlyStats {
  hour: number
  trade_count: number
  total_pnl: number
  win_count: number
  loss_count: number
  win_rate: number
  avg_pnl: number
}

export interface DayOfWeekStats {
  day_of_week: number
  day_name: string
  trade_count: number
  total_pnl: number
  win_count: number
  loss_count: number
  win_rate: number
  avg_pnl: number
}

export interface SymbolDetailedStats {
  symbol: string
  trade_count: number
  total_pnl: number
  total_commission: number
  net_pnl: number
  win_count: number
  loss_count: number
  win_rate: number
  avg_pnl: number
  avg_win: number
  avg_loss: number
  profit_factor: number
  best_trade: number
  worst_trade: number
  total_volume: number
  avg_holding_minutes: number | null
}

export interface HoldingTimeStats {
  range_label: string
  trade_count: number
  total_pnl: number
  win_count: number
  loss_count: number
  win_rate: number
  avg_pnl: number
}

export interface PnlRangeStats {
  range_label: string
  trade_count: number
  percentage: number
}

export interface MarketConditionStats {
  range_label: string
  trade_count: number
  total_pnl: number
  win_count: number
  loss_count: number
  win_rate: number
  avg_pnl: number
  percentage: number
}

export interface RiskRewardAnalysis {
  range_label: string
  trade_count: number
  win_count: number
  loss_count: number
  win_rate: number
  total_pnl: number
  avg_win: number
  avg_loss: number
  risk_reward_ratio: number
  expectancy: number
  total_r: number
}

export interface DailyPnlData {
  date: string
  pnl: number
  cumulative_pnl: number
  trade_count: number
  win_count: number
  loss_count: number
  win_rate: number
  volume: number
  gross_profit: number
  gross_loss: number
  cumulative_profit_factor: number | null
}

export interface StreakData {
  current_streak: number
  max_win_streak: number
  max_loss_streak: number
  current_streak_pnl: number
}

export interface DetailedSummary {
  total_gain_loss: number
  largest_gain: number
  largest_loss: number
  avg_daily_pnl: number
  avg_daily_volume: number
  trading_days: number
  avg_per_share_pnl: number
  avg_trade_pnl: number
  avg_winning_trade: number
  avg_losing_trade: number
  total_trades: number
  winning_trades: number
  winning_pct: number
  losing_trades: number
  losing_pct: number
  scratch_trades: number
  scratch_pct: number
  avg_hold_time_all: number
  avg_hold_time_scratch: number
  avg_hold_time_winning: number
  avg_hold_time_losing: number
  max_consecutive_wins: number
  max_consecutive_losses: number
  pnl_std_dev: number
  sqn: number | null
  prob_random: number | null
  kelly_pct: number | null
  k_ratio: number | null
  profit_factor: number
  total_commissions: number
  total_fees: number
}

export interface AdvancedStatistics {
  summary: AnalysisSummary
  detailed_summary: DetailedSummary
  by_symbol: SymbolDetailedStats[]
  by_hour: HourlyStats[]
  by_day_of_week: DayOfWeekStats[]
  by_holding_time: HoldingTimeStats[]
  pnl_distribution: PnlRangeStats[]
  daily_pnl: DailyPnlData[]
  streak_data: StreakData
  insights: string[]
  // Market condition analysis
  by_volume: MarketConditionStats[]
  by_relative_volume: MarketConditionStats[]
  by_prior_day_volume: MarketConditionStats[]
  by_opening_gap: MarketConditionStats[]
  by_day_movement: MarketConditionStats[]
  by_day_type: MarketConditionStats[]
  by_atr: MarketConditionStats[]
  by_entry_pct_atr: MarketConditionStats[]
  by_relative_volatility: MarketConditionStats[]
  by_price_vs_sma50: MarketConditionStats[]
  // Entry condition analysis with R:R
  by_entry_price: RiskRewardAnalysis[]
  by_gap_percent: RiskRewardAnalysis[]
  by_relative_volume_5d: RiskRewardAnalysis[]
  by_float: RiskRewardAnalysis[]
}

export interface CSVPreview {
  columns: string[]
  sample_rows: Record<string, any>[]
  detected_mapping: {
    date_column: string
    time_column: string | null
    symbol_column: string
    side_column: string
    quantity_column: string
    price_column: string
    commission_column: string | null
    notes_column: string | null
  }
  total_rows: number
}

export interface ImportResult {
  success: boolean
  imported_count: number
  error_count: number
  errors: string[]
}

// Trade APIs
export const getTrades = async (params?: {
  symbol?: string
  side?: string
  start_date?: string
  end_date?: string
  skip?: number
  limit?: number
}): Promise<Trade[]> => {
  const { data } = await api.get('/trades', { params })
  return data
}

export const getTrade = async (id: number): Promise<Trade> => {
  const { data } = await api.get(`/trades/${id}`)
  return data
}

export const createTrade = async (trade: Omit<Trade, 'id' | 'created_at' | 'updated_at'>): Promise<Trade> => {
  const { data } = await api.post('/trades', trade)
  return data
}

export const updateTrade = async (id: number, trade: Partial<Trade>): Promise<Trade> => {
  const { data } = await api.put(`/trades/${id}`, trade)
  return data
}

export const deleteTrade = async (id: number): Promise<void> => {
  await api.delete(`/trades/${id}`)
}

export const previewCSV = async (fileOrContent: File | string): Promise<CSVPreview> => {
  if (typeof fileOrContent === 'string') {
    const { data } = await api.post('/trades/import/preview-text', { content: fileOrContent })
    return data
  }
  const formData = new FormData()
  formData.append('file', fileOrContent)
  const { data } = await api.post('/trades/import/preview', formData)
  return data
}

export const importCSV = async (
  fileOrContent: File | string,
  mapping?: Record<string, any>,
  timezone?: string
): Promise<ImportResult> => {
  if (typeof fileOrContent === 'string') {
    const { data } = await api.post('/trades/import-text', {
      content: fileOrContent,
      mapping: mapping || null,
      timezone: timezone || null
    })
    return data
  }
  const formData = new FormData()
  formData.append('file', fileOrContent)
  if (mapping) {
    formData.append('mapping', JSON.stringify(mapping))
  }
  if (timezone) {
    formData.append('timezone', timezone)
  }
  const { data } = await api.post('/trades/import', formData)
  return data
}

// Position APIs
export const getPositions = async (params?: {
  symbol?: string
  status?: 'open' | 'closed'
}): Promise<Position[]> => {
  const { data } = await api.get('/positions', { params })
  return data
}

export const getPositionDetail = async (positionId: number): Promise<PositionDetail> => {
  const { data } = await api.get(`/positions/${positionId}`)
  return data
}

export const deletePosition = async (positionId: number): Promise<void> => {
  await api.delete(`/positions/${positionId}`)
}

export const deletePositions = async (positionIds: number[]): Promise<void> => {
  const params = positionIds.map(id => `position_ids=${id}`).join('&')
  await api.delete(`/positions?${params}`)
}

// Analysis APIs
export const getAnalysisSummary = async (params?: {
  start_date?: string
  end_date?: string
}): Promise<AnalysisSummary> => {
  const { data } = await api.get('/analysis/summary', { params })
  return data
}

export const getAnalysisBySymbol = async (params?: {
  start_date?: string
  end_date?: string
}): Promise<SymbolAnalysis[]> => {
  const { data } = await api.get('/analysis/by-symbol', { params })
  return data
}

export const getAnalysisByDate = async (params?: {
  start_date?: string
  end_date?: string
}): Promise<DateAnalysis[]> => {
  const { data } = await api.get('/analysis/by-date', { params })
  return data
}

export const getAdvancedStatistics = async (params?: {
  start_date?: string
  end_date?: string
  symbol?: string
}): Promise<AdvancedStatistics> => {
  const { data } = await api.get('/analysis/advanced', { params })
  return data
}

export const fetchMarketData = async (symbols?: string[]): Promise<{
  message: string
  results: Record<string, number>
}> => {
  const params = symbols ? { symbols } : {}
  const { data } = await api.post('/market-data/fetch', null, { params })
  return data
}

export const fetchMarketDataForSymbol = async (
  symbol: string,
  forceRefresh: boolean = false
): Promise<{
  symbol: string
  records_stored: number
  message: string
}> => {
  const { data } = await api.post(`/market-data/fetch/${symbol}`, null, {
    params: { force_refresh: forceRefresh }
  })
  return data
}

// Calendar APIs
export const getCalendarDaily = async (year: number, month: number): Promise<CalendarDay[]> => {
  const { data } = await api.get('/calendar/daily', { params: { year, month } })
  return data
}

export const getCalendarMonthly = async (year: number): Promise<MonthSummary[]> => {
  const { data } = await api.get('/calendar/monthly', { params: { year } })
  return data
}

export const getCalendarYearly = async (): Promise<YearSummary[]> => {
  const { data } = await api.get('/calendar/yearly')
  return data
}

// Market Data APIs
export const getKline = async (params: {
  symbol: string
  interval?: string
  start_date?: string
  end_date?: string
}): Promise<KlineData[]> => {
  const { data } = await api.get('/market/kline', { params })
  return data
}

export const getTradesWithKline = async (params: {
  symbol: string
  start_date?: string
  end_date?: string
}): Promise<{
  symbol: string
  klines: KlineData[]
  trades: Array<{
    id: number
    time: string
    side: string
    price: number
    quantity: number
  }>
}> => {
  const { data } = await api.get('/market/trades-with-kline', { params })
  return data
}

// Journal APIs
export interface Journal {
  id: number
  date: string
  content: string | null
  mood: string | null
  lessons: string | null
  mistakes: string | null
  improvements: string | null
  pnl_summary: number | null
  trade_count: number | null
  created_at: string
  updated_at: string | null
}

export interface JournalWithTrades extends Journal {
  positions: Position[]
}

export const getJournals = async (): Promise<Journal[]> => {
  const { data } = await api.get('/journals')
  return data
}

export const getJournal = async (date: string): Promise<JournalWithTrades> => {
  const { data } = await api.get(`/journals/${date}`)
  return data
}

export const updateJournal = async (date: string, journal: Partial<Journal>): Promise<Journal> => {
  const { data } = await api.put(`/journals/${date}`, journal)
  return data
}

export const deleteJournal = async (date: string): Promise<void> => {
  await api.delete(`/journals/${date}`)
}

export default api
