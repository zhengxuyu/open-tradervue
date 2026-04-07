from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional


class TradeBase(BaseModel):
    symbol: str
    side: str = Field(..., pattern="^(BUY|SELL)$")
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    executed_at: datetime
    commission: float = 0.0
    notes: Optional[str] = None
    tags: list[str] = []


class TradeCreate(TradeBase):
    pass


class TradeUpdate(BaseModel):
    symbol: Optional[str] = None
    side: Optional[str] = Field(None, pattern="^(BUY|SELL)$")
    quantity: Optional[float] = Field(None, gt=0)
    price: Optional[float] = Field(None, gt=0)
    executed_at: Optional[datetime] = None
    commission: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None


class TradeResponse(TradeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PositionBase(BaseModel):
    symbol: str
    entry_price: float
    exit_price: Optional[float] = None
    quantity: float
    pnl: Optional[float] = None
    pnl_percent: Optional[float] = None
    entry_time: datetime
    exit_time: Optional[datetime] = None
    holding_days: Optional[int] = None
    status: str = "open"


class PositionResponse(PositionBase):
    id: int

    class Config:
        from_attributes = True


class AnalysisSummary(BaseModel):
    total_trades: int
    total_pnl: float
    total_commission: float
    net_pnl: float
    win_count: int
    loss_count: int
    win_rate: float
    avg_win: float
    avg_loss: float
    profit_factor: float
    max_drawdown: float
    best_trade: float
    worst_trade: float


class SymbolAnalysis(BaseModel):
    symbol: str
    total_trades: int
    total_pnl: float
    win_rate: float
    avg_pnl: float


class DateAnalysis(BaseModel):
    date: str
    total_pnl: float
    trade_count: int
    win_count: int
    loss_count: int


class CalendarDay(BaseModel):
    date: str
    pnl: float
    trade_count: int
    positions_closed: int


class MonthSummary(BaseModel):
    year: int
    month: int
    total_pnl: float
    trading_days: int
    winning_days: int
    losing_days: int
    best_day: float
    worst_day: float


class YearSummary(BaseModel):
    year: int
    total_pnl: float
    trading_days: int
    winning_days: int
    losing_days: int
    winning_months: int
    losing_months: int


# Advanced Statistics Schemas
class HourlyStats(BaseModel):
    hour: int
    trade_count: int
    total_pnl: float
    win_count: int
    loss_count: int
    win_rate: float
    avg_pnl: float


class DayOfWeekStats(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday
    day_name: str
    trade_count: int
    total_pnl: float
    win_count: int
    loss_count: int
    win_rate: float
    avg_pnl: float


class SymbolDetailedStats(BaseModel):
    symbol: str
    trade_count: int
    total_pnl: float
    total_commission: float
    net_pnl: float
    win_count: int
    loss_count: int
    win_rate: float
    avg_pnl: float
    avg_win: float
    avg_loss: float
    profit_factor: float
    best_trade: float
    worst_trade: float
    total_volume: float
    avg_holding_minutes: Optional[float] = None


class HoldingTimeStats(BaseModel):
    range_label: str  # e.g., "< 5 min", "5-15 min", "15-30 min", etc.
    trade_count: int
    total_pnl: float
    win_count: int
    loss_count: int
    win_rate: float
    avg_pnl: float


class PnlRangeStats(BaseModel):
    range_label: str  # e.g., "-$100 to -$50", "$0 to $50", etc.
    trade_count: int
    percentage: float


class MarketConditionStats(BaseModel):
    """Statistics grouped by a market condition range."""
    range_label: str
    trade_count: int
    total_pnl: float
    win_count: int
    loss_count: int
    win_rate: float
    avg_pnl: float
    percentage: float  # % of total trades


class RiskRewardAnalysis(BaseModel):
    """Risk/Reward analysis for a category."""
    range_label: str
    trade_count: int
    win_count: int
    loss_count: int
    win_rate: float
    total_pnl: float
    avg_win: float
    avg_loss: float
    risk_reward_ratio: float  # avg_win / base_risk
    expectancy: float  # (win_rate * avg_win) - ((1-win_rate) * avg_loss)
    total_r: float  # total P&L in terms of R (total_pnl / base_risk)


class DailyPnlData(BaseModel):
    date: str
    pnl: float
    cumulative_pnl: float
    trade_count: int
    win_count: int
    loss_count: int
    win_rate: float
    volume: float
    gross_profit: float = 0
    gross_loss: float = 0
    cumulative_profit_factor: Optional[float] = None


class StreakData(BaseModel):
    current_streak: int  # positive = win streak, negative = loss streak
    max_win_streak: int
    max_loss_streak: int
    current_streak_pnl: float


class DetailedSummary(BaseModel):
    """Comprehensive statistics matching Tradervue format."""
    # Basic P&L
    total_gain_loss: float
    largest_gain: float
    largest_loss: float

    # Daily Averages
    avg_daily_pnl: float
    avg_daily_volume: float
    trading_days: int

    # Per-share/trade metrics
    avg_per_share_pnl: float
    avg_trade_pnl: float
    avg_winning_trade: float
    avg_losing_trade: float

    # Trade counts
    total_trades: int
    winning_trades: int
    winning_pct: float
    losing_trades: int
    losing_pct: float
    scratch_trades: int
    scratch_pct: float

    # Hold times
    avg_hold_time_all: float  # minutes
    avg_hold_time_scratch: float  # minutes
    avg_hold_time_winning: float  # minutes
    avg_hold_time_losing: float  # minutes

    # Streaks
    max_consecutive_wins: int
    max_consecutive_losses: int

    # Advanced Metrics
    pnl_std_dev: float
    sqn: Optional[float] = None  # System Quality Number
    prob_random: Optional[float] = None  # Probability of random chance
    kelly_pct: Optional[float] = None  # Kelly percentage
    k_ratio: Optional[float] = None  # K-ratio
    profit_factor: float

    # Costs
    total_commissions: float
    total_fees: float


class RiskRewardStats(BaseModel):
    avg_risk_reward_ratio: float
    trades_with_good_rr: int  # R:R >= 2
    trades_with_bad_rr: int   # R:R < 1
    best_rr_trade: float
    worst_rr_trade: float


class ConsecutiveLossAlert(BaseModel):
    current_consecutive_losses: int
    max_daily_loss: float
    suggested_stop: bool  # True if should stop trading today


class AdvancedStatistics(BaseModel):
    summary: AnalysisSummary
    detailed_summary: DetailedSummary
    by_symbol: list[SymbolDetailedStats]
    by_hour: list[HourlyStats]
    by_day_of_week: list[DayOfWeekStats]
    by_holding_time: list[HoldingTimeStats]
    pnl_distribution: list[PnlRangeStats]
    daily_pnl: list[DailyPnlData]
    streak_data: StreakData
    insights: list[str]  # AI-generated trading insights

    # Market condition analysis
    by_volume: list[MarketConditionStats]  # By instrument volume
    by_relative_volume: list[MarketConditionStats]  # By relative volume (% of 50MA)
    by_prior_day_volume: list[MarketConditionStats]  # By prior day relative volume
    by_opening_gap: list[MarketConditionStats]  # By opening gap %
    by_day_movement: list[MarketConditionStats]  # By intraday movement %
    by_day_type: list[MarketConditionStats]  # By day type
    by_atr: list[MarketConditionStats]  # By ATR
    by_entry_pct_atr: list[MarketConditionStats]  # By entry % of ATR
    by_relative_volatility: list[MarketConditionStats]  # By TR/ATR
    by_price_vs_sma50: list[MarketConditionStats]  # By price vs 50-day SMA

    # Entry condition analysis (with R:R)
    by_entry_price: list[RiskRewardAnalysis]  # By entry price range
    by_gap_percent: list[RiskRewardAnalysis]  # By gap % from previous close
    by_relative_volume_5d: list[RiskRewardAnalysis]  # By volume vs 5-day avg
    by_float: list[RiskRewardAnalysis]  # By float (流通股) size


class KlineData(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class CSVFieldMapping(BaseModel):
    date_column: str = "Date"
    time_column: Optional[str] = None
    symbol_column: str = "Symbol"
    side_column: str = "Side"
    quantity_column: str = "Quantity"
    price_column: str = "Price"
    commission_column: Optional[str] = None
    notes_column: Optional[str] = None
    date_format: str = "%Y-%m-%d"
    time_format: str = "%H:%M:%S"


class CSVPreview(BaseModel):
    columns: list[str]
    sample_rows: list[dict]
    detected_mapping: CSVFieldMapping
    total_rows: int


class ImportResult(BaseModel):
    success: bool
    imported_count: int
    error_count: int
    errors: list[str] = []


class CSVTextPreviewRequest(BaseModel):
    content: str


class CSVTextImportRequest(BaseModel):
    content: str
    mapping: Optional[CSVFieldMapping] = None
    timezone: Optional[str] = None


class PositionDetailResponse(BaseModel):
    id: int
    symbol: str
    entry_price: float
    exit_price: Optional[float] = None
    quantity: float
    pnl: Optional[float] = None
    pnl_percent: Optional[float] = None
    entry_time: datetime
    exit_time: Optional[datetime] = None
    holding_days: Optional[int] = None
    status: str
    total_commission: float
    trades: list[TradeResponse]
    entry_trade_ids: list[int]
    exit_trade_ids: list[int]


# Journal schemas
class JournalBase(BaseModel):
    date: str  # YYYY-MM-DD format
    content: Optional[str] = None
    mood: Optional[str] = None
    lessons: Optional[str] = None
    mistakes: Optional[str] = None
    improvements: Optional[str] = None


class JournalCreate(JournalBase):
    pass


class JournalUpdate(BaseModel):
    content: Optional[str] = None
    mood: Optional[str] = None
    lessons: Optional[str] = None
    mistakes: Optional[str] = None
    improvements: Optional[str] = None


class JournalResponse(JournalBase):
    id: int
    pnl_summary: Optional[float] = None
    trade_count: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JournalWithTrades(JournalResponse):
    positions: list[PositionResponse] = []


class UserCreate(BaseModel):
    email: str
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
