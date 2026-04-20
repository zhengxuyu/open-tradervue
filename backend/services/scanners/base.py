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

    async def enrich(self, items: list[ScannerResultItem], data_source: MarketDataSource) -> list[ScannerResultItem]:
        """Check news for all results. Breaking (< 2h) = red, recent (< 24h) = yellow."""
        if not items:
            return items
        symbols = [item.symbol for item in items[:50]]  # limit to top 50 to avoid slow API
        news_24h = await data_source.check_news(symbols, hours=24)
        news_2h = await data_source.check_news(symbols, hours=2)
        for item in items:
            if news_2h.get(item.symbol):
                item.has_news = True
                item.news_type = "breaking"
            elif news_24h.get(item.symbol):
                item.has_news = True
                item.news_type = "recent"
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
        items = await self.enrich(items, data_source)

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
        items = await self.enrich(items, data_source)

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


class MultiStrategyAlertScanner(BaseScanner):
    """Alert scanner with multiple sub-strategies.

    Each strategy has its own query, filter, and name. A stock can trigger
    multiple times if it matches different strategies, or re-triggers
    when price changes significantly (>5%).

    Subclass must implement:
      - get_strategies() -> list of (strategy_name, query, post_filter_fn)
    """

    max_alerts: int = 100
    sort_by: str = "time"
    sort_dir: str = "desc"
    retrigger_pct: float = 5.0  # re-alert if price changed by this %

    def __init__(self):
        super().__init__()
        # Track: {symbol: {strategy: last_price}}
        self._seen: dict[str, dict[str, float]] = {}
        self._alerts: list[ScannerResultItem] = []
        self._baseline_set: bool = False
        self._last_reset: datetime = datetime.now(_ET)

    def build_query(self) -> yf.EquityQuery:
        # Not used directly — each strategy has its own query
        raise NotImplementedError

    def get_strategies(self) -> list[tuple[str, yf.EquityQuery, callable]]:
        """Return list of (strategy_name, query, post_filter_fn).
        post_filter_fn takes list[ScannerResultItem] and returns filtered list.
        """
        raise NotImplementedError

    def _should_reset(self) -> bool:
        now = datetime.now(_ET)
        if now.date() != self._last_reset.date():
            return True
        reset_time = now.replace(hour=4, minute=0, second=0, microsecond=0)
        if self._last_reset < reset_time <= now:
            return True
        return False

    def _should_alert(self, symbol: str, strategy: str, price: float) -> bool:
        """Check if this symbol+strategy combo should trigger an alert."""
        if symbol not in self._seen:
            return True
        if strategy not in self._seen[symbol]:
            return True
        # Re-trigger if price changed significantly
        last_price = self._seen[symbol][strategy]
        if last_price > 0:
            pct_change = abs(price - last_price) / last_price * 100
            return pct_change >= self.retrigger_pct
        return False

    def _record(self, symbol: str, strategy: str, price: float):
        if symbol not in self._seen:
            self._seen[symbol] = {}
        self._seen[symbol][strategy] = price

    async def scan(self, data_source: MarketDataSource) -> ScannerResponse:
        start_time = time.time()

        if self._should_reset():
            self._seen.clear()
            self._alerts.clear()
            self._baseline_set = False
            self._last_reset = datetime.now(_ET)

        strategies = self.get_strategies()
        now_str = datetime.now(_ET).strftime("%I:%M:%S %p").lower()
        new_count = 0

        for strategy_name, query, filter_fn in strategies:
            cache_key = f"{self.id}_{strategy_name}"
            items = await data_source.fetch(
                cache_key=cache_key,
                query=query,
                sort_field="percentchange",
                sort_asc=False,
                count=50,
            )
            items = filter_fn(items)

            if not self._baseline_set:
                # First scan: record baseline
                for item in items:
                    self._record(item.symbol, strategy_name, item.price or 0)
            else:
                for item in items:
                    price = item.price or 0
                    if self._should_alert(item.symbol, strategy_name, price):
                        self._record(item.symbol, strategy_name, price)
                        item.time = now_str
                        item.strategy_name = strategy_name
                        self._alerts.insert(0, item)
                        new_count += 1

        if not self._baseline_set:
            self._baseline_set = True

        self._alerts = self._alerts[:self.max_alerts]

        elapsed_ms = int((time.time() - start_time) * 1000)
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
