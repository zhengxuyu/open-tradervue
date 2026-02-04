import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

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

export interface CSVPreview {
  columns: string[]
  sample_rows: Record<string, any>[]
  detected_mapping: {
    date_column: string
    symbol_column: string
    side_column: string
    quantity_column: string
    price_column: string
    commission_column: string | null
    notes_column: string | null
    date_format: string
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
