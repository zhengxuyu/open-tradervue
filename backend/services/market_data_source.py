"""Common market data source — fetches and caches Yahoo Finance screener data."""

import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

import pandas as pd
import yfinance as yf
from yfinance import screen as yf_screen

from ..schemas import ScannerResultItem

# US market hours
_ET = ZoneInfo("America/New_York")
_MARKET_OPEN_HOUR = 9
_MARKET_OPEN_MIN = 30
_MARKET_MINUTES = 390  # 6.5 hours
_PRE_MARKET_START_MINUTE = 4 * 60
_REGULAR_MARKET_OPEN_MINUTE = _MARKET_OPEN_HOUR * 60 + _MARKET_OPEN_MIN
_CHART_BATCH_SIZE = 50


def get_market_state() -> str:
    """Return 'PRE', 'REGULAR', or 'POST' based on current ET time."""
    now_et = datetime.now(_ET)
    h, m = now_et.hour, now_et.minute
    t = h * 60 + m
    if t < 4 * 60:        # before 4:00 AM
        return "CLOSED"
    if t < 9 * 60 + 30:   # 4:00 AM - 9:29 AM
        return "PRE"
    if t < 16 * 60:       # 9:30 AM - 3:59 PM
        return "REGULAR"
    if t < 20 * 60:       # 4:00 PM - 7:59 PM
        return "POST"
    return "CLOSED"


def _minutes_of_trading() -> float:
    """Minutes elapsed in current trading session (pre/regular/post)."""
    now_et = datetime.now(_ET)
    h, m = now_et.hour, now_et.minute
    t = h * 60 + m
    state = get_market_state()
    if state == "PRE":
        return t - 4 * 60          # minutes since 4:00 AM
    if state == "REGULAR":
        return t - (9 * 60 + 30)   # minutes since 9:30 AM
    if state == "POST":
        return t - 16 * 60         # minutes since 4:00 PM
    return 1  # avoid division by zero


def _session_minutes(index: pd.DatetimeIndex) -> pd.Series:
    """Return minutes since midnight ET for each bar timestamp."""
    dt_index = pd.DatetimeIndex(index)
    if dt_index.tz is None:
        dt_index = dt_index.tz_localize(_ET)
    else:
        dt_index = dt_index.tz_convert(_ET)
    return pd.Series(dt_index.hour * 60 + dt_index.minute, index=index)


def apply_premarket_chart_metrics(
    item: ScannerResultItem,
    bars: pd.DataFrame,
    avg_volume_10d: float | None,
    elapsed_minutes: float | None = None,
) -> ScannerResultItem:
    """Update a scanner item with accurate pre-market metrics from 1m chart bars."""
    required_columns = {"Open", "High", "Low", "Close", "Volume"}
    if bars.empty or not required_columns.issubset(set(bars.columns)):
        return item

    minutes = _session_minutes(pd.DatetimeIndex(bars.index))
    premarket = bars.loc[
        (minutes >= _PRE_MARKET_START_MINUTE)
        & (minutes < _REGULAR_MARKET_OPEN_MINUTE)
    ].copy()
    premarket = premarket.dropna(subset=["Close"])
    if premarket.empty:
        return item

    latest_price = float(premarket["Close"].iloc[-1])
    high = float(premarket["High"].max())
    low = float(premarket["Low"].min())
    open_values = premarket["Open"].dropna()
    open_price = float(open_values.iloc[0]) if not open_values.empty else latest_price
    volume = int(premarket["Volume"].fillna(0).sum())
    prev_close = item.prev_close

    item.price = round(latest_price, 2)
    item.volume = volume
    item.day_high = round(high, 2)
    item.day_low = round(low, 2)
    item.open_price = round(open_price, 2)

    if prev_close and prev_close > 0:
        change_pct = (latest_price - prev_close) / prev_close * 100
        item.change_from_close_pct = round(change_pct, 2)
        item.gap_pct = round(change_pct, 2)

    if avg_volume_10d and avg_volume_10d > 0:
        item.relative_volume_daily = round(volume / avg_volume_10d, 2)
        minutes_elapsed = elapsed_minutes if elapsed_minutes and elapsed_minutes > 0 else _minutes_of_trading()
        if minutes_elapsed > 0:
            rate_now = volume / minutes_elapsed
            rate_avg = avg_volume_10d / _MARKET_MINUTES
            if rate_avg > 0:
                item.relative_volume_5min = round(rate_now / rate_avg, 2)

    if high > low:
        item.pos_in_range_pct = round((latest_price - low) / (high - low) * 100, 2)

    return item

logger = logging.getLogger("daytradedash.datasource")

# Major US exchanges (exclude OTC tiers PNK/OQB/OQX and ambiguous YHD/OEM).
# NMS=Nasdaq Global Select, NGM=Nasdaq Global, NCM=Nasdaq Capital,
# NYQ=NYSE, ASE=NYSE American, PCX=NYSE Arca, BTS=CBOE BZX (legacy BATS).
US_EXCHANGES = yf.EquityQuery("or", [
    yf.EquityQuery("eq", ["exchange", "NMS"]),
    yf.EquityQuery("eq", ["exchange", "NYQ"]),
    yf.EquityQuery("eq", ["exchange", "NGM"]),
    yf.EquityQuery("eq", ["exchange", "NCM"]),
    yf.EquityQuery("eq", ["exchange", "ASE"]),
    yf.EquityQuery("eq", ["exchange", "PCX"]),
    yf.EquityQuery("eq", ["exchange", "BTS"]),
])

US_REGION = yf.EquityQuery("eq", ["region", "us"])


def us_equity(*conditions: yf.EquityQuery) -> yf.EquityQuery:
    """Build a query scoped to US major exchanges."""
    return yf.EquityQuery("and", [US_REGION, US_EXCHANGES, *conditions])


def _is_warrant_or_right(symbol: str, quote: dict) -> bool:
    s = symbol.upper()
    if s.endswith("W") or s.endswith("WS") or s.endswith("WW"):
        return True
    if "-RT" in s or "-WT" in s or "-UN" in s:
        return True
    if s.endswith("R") and len(s) >= 4:
        name = (quote.get("shortName") or "").lower()
        if "right" in name:
            return True
    name = (quote.get("shortName") or quote.get("longName") or "").lower()
    return any(kw in name for kw in ["warrant", "warrants", "rights", "units"])


def quote_to_item(q: dict) -> Optional[ScannerResultItem]:
    """Convert a Yahoo Finance quote dict to ScannerResultItem."""
    symbol = q.get("symbol")
    if not symbol or _is_warrant_or_right(symbol, q):
        return None

    market_state = q.get("marketState", "")

    # Price: use pre/post market price when available
    if market_state == "PRE" and q.get("preMarketPrice"):
        price = q.get("preMarketPrice")
    elif market_state == "POST" and q.get("postMarketPrice"):
        price = q.get("postMarketPrice")
    else:
        price = q.get("regularMarketPrice")

    if price is None:
        return None

    # Pick the right "previous close" baseline. During PRE,
    # regularMarketPrice IS yesterday's close (most recent completed regular
    # session); regularMarketPreviousClose is the close BEFORE that (two
    # days ago). Yahoo's own preMarketChangePercent field uses
    # regularMarketPrice as the baseline, so we follow suit for consistency
    # with the user-visible chg displayed in pre-market.
    if market_state == "PRE":
        prev_close = q.get("regularMarketPrice") or q.get("regularMarketPreviousClose")
    else:
        prev_close = q.get("regularMarketPreviousClose")
    avg_vol_10d = q.get("averageDailyVolume10Day")

    # During pre-market, regularMarket* fields are stale (previous session).
    # Set initial values from pre-market price; chart enrichment will overwrite
    # with accurate 1m bar data for stocks with actual pre-market activity.
    if market_state == "PRE":
        change_pct = ((price - prev_close) / prev_close * 100) if prev_close and prev_close > 0 else None
        volume = 0  # will be set by chart enrichment from actual bars
        day_high = price
        day_low = price
        open_price = price
    else:
        change_pct = q.get("regularMarketChangePercent")
        volume = q.get("regularMarketVolume")
        day_high = q.get("regularMarketDayHigh")
        day_low = q.get("regularMarketDayLow")
        open_price = q.get("regularMarketOpen")

    rvol = round(volume / avg_vol_10d, 2) if volume and avg_vol_10d and avg_vol_10d > 0 else None

    # Relative Volume 5min: current volume rate vs average rate
    rvol_5min = None
    mins = _minutes_of_trading()
    if volume and avg_vol_10d and avg_vol_10d > 0 and mins > 0:
        rate_now = volume / mins
        rate_avg = avg_vol_10d / _MARKET_MINUTES
        if rate_avg > 0:
            rvol_5min = round(rate_now / rate_avg, 2)

    gap = round((price - prev_close) / prev_close * 100, 2) if market_state == "PRE" and prev_close and prev_close > 0 else (round((open_price - prev_close) / prev_close * 100, 2) if open_price and prev_close and prev_close > 0 else None)
    pos_range = round((price - day_low) / (day_high - day_low) * 100, 2) if price and day_high and day_low and (day_high - day_low) > 0 else None
    post_chg = q.get("postMarketChangePercent")

    return ScannerResultItem(
        symbol=symbol,
        price=round(price, 2),
        change_from_close_pct=round(change_pct, 2) if change_pct is not None else None,
        volume=volume,
        float_shares=q.get("sharesOutstanding"),
        relative_volume_daily=rvol,
        relative_volume_5min=rvol_5min,
        gap_pct=gap,
        short_interest=None,
        market_cap=q.get("marketCap"),
        pos_in_range_pct=pos_range,
        regular_close_price=round(prev_close, 2) if prev_close else None,
        change_from_regular_close_pct=round(post_chg, 2) if post_chg is not None else None,
        day_high=round(day_high, 2) if day_high else None,
        day_low=round(day_low, 2) if day_low else None,
        open_price=round(open_price, 2) if open_price else None,
        prev_close=round(prev_close, 2) if prev_close else None,
    )


class MarketDataSource:
    """Shared data source that fetches and caches Yahoo Finance screener results."""

    def __init__(self, cache_ttl_seconds: int = 10):
        self._cache: dict[str, tuple[list[ScannerResultItem], datetime]] = {}
        self._cache_ttl = timedelta(seconds=cache_ttl_seconds)
        self._news_cache: dict[str, tuple[dict[str, bool], datetime]] = {}
        # floatShares changes infrequently (offerings, lockup expiry, buybacks)
        # so cache aggressively. Yahoo screener doesn't return floatShares —
        # only sharesOutstanding — so we fetch per-ticker via Ticker.info.
        self._float_cache: dict[str, tuple[Optional[int], datetime]] = {}
        self._float_cache_ttl = timedelta(hours=24)

    def _is_cache_valid(self, key: str) -> bool:
        if key not in self._cache:
            return False
        _, cached_at = self._cache[key]
        return datetime.now() < cached_at + self._cache_ttl

    def _fetch_sync(
        self,
        query: yf.EquityQuery,
        sort_field: str = "percentchange",
        sort_asc: bool = False,
        count: int = 200,
    ) -> list[ScannerResultItem]:
        results: list[ScannerResultItem] = []
        avg_volume_by_symbol: dict[str, float | None] = {}
        # Yahoo screener caps a single call at 250 rows. Page through with
        # offset when callers want more — yfinance itself does not paginate.
        _YAHOO_PAGE_SIZE = 250
        try:
            offset = 0
            while offset < count:
                page_count = min(_YAHOO_PAGE_SIZE, count - offset)
                data = yf_screen(
                    query,
                    offset=offset,
                    count=page_count,
                    sortField=sort_field,
                    sortAsc=sort_asc,
                )
                quotes = data.get("quotes", []) or []
                for q in quotes:
                    item = quote_to_item(q)
                    if item is not None:
                        results.append(item)
                        avg_volume_by_symbol[item.symbol] = q.get("averageDailyVolume10Day")
                # Short page means Yahoo has no more rows for this query.
                if len(quotes) < page_count:
                    break
                offset += page_count
        except Exception as exc:
            logger.error("MarketDataSource fetch failed: %s", exc)
            return results

        if get_market_state() == "PRE" and results:
            try:
                self._enrich_premarket_charts_sync(results, avg_volume_by_symbol)
            except Exception as exc:
                logger.warning("Pre-market chart enrichment failed: %s", exc)
        return results

    def _enrich_premarket_charts_sync(
        self,
        items: list[ScannerResultItem],
        avg_volume_by_symbol: dict[str, float | None],
    ) -> None:
        """Fetch 1m pre/post chart data and update scanner items in place."""
        if not items:
            return

        symbols = [item.symbol for item in items]
        charts = self._fetch_intraday_charts_sync(symbols)
        elapsed_minutes = _minutes_of_trading()
        for item in items:
            bars = charts.get(item.symbol)
            if bars is None:
                continue
            apply_premarket_chart_metrics(
                item,
                bars,
                avg_volume_by_symbol.get(item.symbol),
                elapsed_minutes=elapsed_minutes,
            )

    def _fetch_intraday_charts_sync(self, symbols: list[str]) -> dict[str, pd.DataFrame]:
        charts: dict[str, pd.DataFrame] = {}
        for i in range(0, len(symbols), _CHART_BATCH_SIZE):
            chunk = symbols[i:i + _CHART_BATCH_SIZE]
            try:
                data = yf.download(
                    tickers=" ".join(chunk),
                    period="1d",
                    interval="1m",
                    prepost=True,
                    group_by="ticker",
                    auto_adjust=False,
                    progress=False,
                    threads=True,
                )
            except Exception as exc:
                logger.error("Intraday chart fetch failed for %s: %s", ",".join(chunk), exc)
                continue

            for symbol in chunk:
                chart = self._extract_symbol_chart(data, symbol, single_symbol=len(chunk) == 1)
                if chart is not None and not chart.empty:
                    charts[symbol] = chart
        return charts

    @staticmethod
    def _extract_symbol_chart(
        data: pd.DataFrame,
        symbol: str,
        single_symbol: bool = False,
    ) -> pd.DataFrame | None:
        if data.empty:
            return None
        if not isinstance(data.columns, pd.MultiIndex):
            return data
        if symbol in data.columns.get_level_values(0):
            return data[symbol]
        if symbol in data.columns.get_level_values(-1):
            return data.xs(symbol, axis=1, level=-1)
        if single_symbol:
            return data.droplevel(0, axis=1)
        return None

    async def fetch(
        self,
        cache_key: str,
        query: yf.EquityQuery,
        sort_field: str = "percentchange",
        sort_asc: bool = False,
        count: int = 200,
    ) -> list[ScannerResultItem]:
        """Fetch with caching. Returns cached results if still valid."""
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key][0]

        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None, self._fetch_sync, query, sort_field, sort_asc, count,
        )

        self._cache[cache_key] = (results, datetime.now())
        logger.info("Cache refreshed for '%s': %d results", cache_key, len(results))
        return results

    def _check_news_sync(self, symbols: list[str], hours: int = 24) -> dict[str, bool]:
        """Check if symbols have recent news. Returns {symbol: has_news}."""
        result: dict[str, bool] = {}
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        for sym in symbols:
            try:
                ticker = yf.Ticker(sym)
                news = ticker.news or []
                has_recent = False
                for item in news[:5]:
                    content = item.get("content", {})
                    pub_date = content.get("pubDate", "")
                    if pub_date:
                        pub_dt = datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
                        if pub_dt > cutoff:
                            has_recent = True
                            break
                result[sym] = has_recent
            except Exception:
                result[sym] = False
        return result

    def _fetch_floats_sync(self, symbols: list[str]) -> dict[str, Optional[int]]:
        """Resolve real floatShares per symbol with 24h caching. Falls back
        to sharesOutstanding when floatShares is missing."""
        result: dict[str, Optional[int]] = {}
        to_fetch: list[str] = []
        now = datetime.now()
        for sym in symbols:
            cached = self._float_cache.get(sym)
            if cached is not None and now < cached[1] + self._float_cache_ttl:
                result[sym] = cached[0]
            else:
                to_fetch.append(sym)
        for sym in to_fetch:
            value: Optional[int] = None
            try:
                info = yf.Ticker(sym).info or {}
                raw = info.get("floatShares") or info.get("sharesOutstanding")
                if raw:
                    value = int(raw)
            except Exception as exc:
                logger.warning("Float fetch failed for %s: %s", sym, exc)
            self._float_cache[sym] = (value, now)
            result[sym] = value
        return result

    async def enrich_floats(self, items: list[ScannerResultItem]) -> None:
        """Overwrite item.float_shares with Yahoo's real floatShares (cached).
        No-op when items is empty."""
        if not items:
            return
        symbols = [item.symbol for item in items]
        loop = asyncio.get_event_loop()
        floats = await loop.run_in_executor(None, self._fetch_floats_sync, symbols)
        for item in items:
            real_float = floats.get(item.symbol)
            if real_float is not None:
                item.float_shares = real_float

    async def check_news(self, symbols: list[str], hours: int = 24) -> dict[str, bool]:
        """Async wrapper for news check. Cached for 5 minutes."""
        if not symbols:
            return {}
        # Hash the full sorted symbol list — truncating to 10 caused cache
        # collisions across scans that shared their first 10 symbols but
        # differed past index 10, returning the wrong news map.
        import hashlib
        symbols_key = hashlib.sha1(",".join(sorted(symbols)).encode()).hexdigest()[:16]
        cache_key = f"news_{hours}h_{symbols_key}"
        if cache_key in self._news_cache:
            result, cached_at = self._news_cache[cache_key]
            if datetime.now() < cached_at + timedelta(minutes=5):
                return result

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, self._check_news_sync, symbols, hours)

        self._news_cache[cache_key] = (result, datetime.now())
        return result
