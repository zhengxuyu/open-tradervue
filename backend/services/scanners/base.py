"""Base scanner classes — all scanners inherit from these."""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone

import yfinance as yf

from ...schemas import ScannerResultItem, ScannerPreset, ScannerResponse
from ..market_data_source import MarketDataSource

import time

_ET = timezone(timedelta(hours=-4))


class BaseScanner(ABC):
    """Abstract base class for regular scanners (snapshot-based).

    To create a new scanner, subclass this and implement:
      - id, name, description
      - build_query() -> yf.EquityQuery

    Optionally override:
      - sort_field, sort_asc, sort_by, sort_dir, count
      - post_filter(items) for additional filtering after fetch
    """

    id: str
    name: str
    description: str
    sort_field: str = "percentchange"
    sort_asc: bool = False
    sort_by: str = "change_from_close_pct"
    sort_dir: str = "desc"
    count: int = 200

    @abstractmethod
    def build_query(self) -> yf.EquityQuery:
        ...

    def post_filter(self, items: list[ScannerResultItem]) -> list[ScannerResultItem]:
        return items

    async def scan(self, data_source: MarketDataSource) -> ScannerResponse:
        start = time.time()

        items = await data_source.fetch(
            cache_key=self.id,
            query=self.build_query(),
            sort_field=self.sort_field,
            sort_asc=self.sort_asc,
            count=self.count,
        )

        items = self.post_filter(items)

        reverse = self.sort_dir == "desc"
        items.sort(key=lambda x: getattr(x, self.sort_by, None) or 0, reverse=reverse)

        elapsed_ms = int((time.time() - start) * 1000)
        return ScannerResponse(
            results=items,
            total=len(items),
            scan_time_ms=elapsed_ms,
            preset=self.id,
        )

    def to_preset(self) -> ScannerPreset:
        return ScannerPreset(
            id=self.id,
            name=self.name,
            description=self.description,
            category="scanner",
            sort_by=self.sort_by,
            sort_dir=self.sort_dir,
        )


class BaseAlertScanner(BaseScanner):
    """Alert scanner — tracks new entries and records trigger time + strategy.

    Unlike regular scanners that show a snapshot, alerts accumulate:
    when a stock newly meets the criteria, it's added with a timestamp.
    Previously seen stocks are not repeated.

    Subclass must also set:
      - strategy_name: str (e.g., "5 Pillar HOD alert")
      - max_alerts: int (max alerts to keep, default 50)
    """

    strategy_name: str = "Alert"
    max_alerts: int = 50
    sort_by: str = "time"
    sort_dir: str = "desc"

    def __init__(self):
        super().__init__()
        self._seen_symbols: set[str] = set()
        self._alerts: list[ScannerResultItem] = []
        self._baseline_set: bool = False
        self._last_reset: datetime = datetime.now(_ET)

    def _should_reset(self) -> bool:
        """Reset alerts at start of each trading day (4:00 AM ET)."""
        now = datetime.now(_ET)
        if now.date() != self._last_reset.date():
            return True
        reset_time = now.replace(hour=4, minute=0, second=0, microsecond=0)
        if self._last_reset < reset_time <= now:
            return True
        return False

    async def scan(self, data_source: MarketDataSource) -> ScannerResponse:
        start = time.time()

        # Reset at start of new trading day
        if self._should_reset():
            self._seen_symbols.clear()
            self._alerts.clear()
            self._baseline_set = False
            self._last_reset = datetime.now(_ET)

        # Fetch current matches
        items = await data_source.fetch(
            cache_key=self.id,
            query=self.build_query(),
            sort_field=self.sort_field,
            sort_asc=self.sort_asc,
            count=self.count,
        )

        items = self.post_filter(items)

        new_count = 0
        if not self._baseline_set:
            # First scan: record existing symbols as baseline, don't alert
            for item in items:
                self._seen_symbols.add(item.symbol)
            self._baseline_set = True
        else:
            # Subsequent scans: only alert on NEW symbols
            now_str = datetime.now(_ET).strftime("%I:%M:%S %p").lower()
            for item in items:
                if item.symbol not in self._seen_symbols:
                    self._seen_symbols.add(item.symbol)
                    item.time = now_str
                    item.strategy_name = self.strategy_name
                    self._alerts.insert(0, item)
                    new_count += 1

        # Trim to max
        self._alerts = self._alerts[:self.max_alerts]

        elapsed_ms = int((time.time() - start) * 1000)
        return ScannerResponse(
            results=list(self._alerts),
            total=len(self._alerts),
            scan_time_ms=elapsed_ms,
            preset=self.id,
            new_alerts=new_count,
        )

    def to_preset(self) -> ScannerPreset:
        return ScannerPreset(
            id=self.id,
            name=self.name,
            description=self.description,
            category="alert",
            sort_by=self.sort_by,
            sort_dir=self.sort_dir,
        )
