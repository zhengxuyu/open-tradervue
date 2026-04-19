"""Common market data source — fetches and caches Yahoo Finance screener data."""

import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional

import yfinance as yf
from yfinance import screen as yf_screen

from ..schemas import ScannerResultItem

# US market hours
_ET = timezone(timedelta(hours=-4))  # EDT
_MARKET_OPEN_HOUR = 9
_MARKET_OPEN_MIN = 30
_MARKET_MINUTES = 390  # 6.5 hours


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

logger = logging.getLogger("daytradedash.datasource")

# Major US exchanges (exclude OTC/Pink Sheets)
US_EXCHANGES = yf.EquityQuery("or", [
    yf.EquityQuery("eq", ["exchange", "NMS"]),
    yf.EquityQuery("eq", ["exchange", "NYQ"]),
    yf.EquityQuery("eq", ["exchange", "NGM"]),
    yf.EquityQuery("eq", ["exchange", "NCM"]),
    yf.EquityQuery("eq", ["exchange", "ASE"]),
    yf.EquityQuery("eq", ["exchange", "PCX"]),
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
    if market_state == "PRE" and q.get("preMarketPrice"):
        price = q.get("preMarketPrice")
        change_pct = q.get("preMarketChangePercent")
    elif market_state == "POST" and q.get("postMarketPrice"):
        price = q.get("postMarketPrice")
        change_pct = q.get("postMarketChangePercent")
    else:
        price = q.get("regularMarketPrice")
        change_pct = q.get("regularMarketChangePercent")

    if price is None:
        return None

    volume = q.get("regularMarketVolume")
    avg_vol_10d = q.get("averageDailyVolume10Day")
    day_high = q.get("regularMarketDayHigh")
    day_low = q.get("regularMarketDayLow")
    open_price = q.get("regularMarketOpen")
    prev_close = q.get("regularMarketPreviousClose")

    rvol = round(volume / avg_vol_10d, 2) if volume and avg_vol_10d and avg_vol_10d > 0 else None

    # Relative Volume 5min: current volume rate vs average rate
    rvol_5min = None
    mins = _minutes_of_trading()
    if volume and avg_vol_10d and avg_vol_10d > 0 and mins > 0:
        rate_now = volume / mins
        rate_avg = avg_vol_10d / _MARKET_MINUTES
        if rate_avg > 0:
            rvol_5min = round(rate_now / rate_avg, 2)

    gap = round((open_price - prev_close) / prev_close * 100, 2) if open_price and prev_close and prev_close > 0 else None
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
        try:
            data = yf_screen(query, count=count, sortField=sort_field, sortAsc=sort_asc)
            for q in data.get("quotes", []):
                item = quote_to_item(q)
                if item is not None:
                    results.append(item)
        except Exception as exc:
            logger.error("MarketDataSource fetch failed: %s", exc)
        return results

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
