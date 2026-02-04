from pydantic import BaseModel, Field
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


class KlineData(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class CSVFieldMapping(BaseModel):
    date_column: str = "Date"
    symbol_column: str = "Symbol"
    side_column: str = "Side"
    quantity_column: str = "Quantity"
    price_column: str = "Price"
    commission_column: Optional[str] = None
    notes_column: Optional[str] = None
    date_format: str = "%Y-%m-%d %H:%M:%S"


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
