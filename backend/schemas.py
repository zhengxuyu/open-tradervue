from pydantic import BaseModel
from typing import Optional


# Scanner schemas
class ScannerResultItem(BaseModel):
    symbol: str
    price: float | None = None
    change_from_close_pct: float | None = None
    volume: int | None = None
    float_shares: float | None = None
    relative_volume_daily: float | None = None
    relative_volume_5min: float | None = None
    gap_pct: float | None = None
    short_interest: float | None = None
    market_cap: float | None = None
    pos_in_range_pct: float | None = None
    regular_close_price: float | None = None
    ah_volume: int | None = None
    avg_ah_volume_120min: float | None = None
    change_from_regular_close_pct: float | None = None
    avg_volume_5min: float | None = None
    day_high: float | None = None
    day_low: float | None = None
    open_price: float | None = None
    prev_close: float | None = None
    has_news: bool = False
    news_type: str | None = None  # "breaking" (red) or "recent" (yellow)
    time: str | None = None
    strategy_name: str | None = None


class ScannerPreset(BaseModel):
    id: str
    name: str
    description: str
    category: str
    sort_by: str
    sort_dir: str


class ScannerResponse(BaseModel):
    results: list[ScannerResultItem]
    total: int
    scan_time_ms: int
    preset: str | None = None
    new_alerts: int = 0  # number of new alerts since last scan (alert scanners only)
