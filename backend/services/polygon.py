"""Polygon.io market data — used for pre-market scanning.

Polygon's snapshot endpoints provide real-time pre-market data (change%, volume,
HOD) in a single API call, unlike Yahoo which only has stale regularMarket fields.
"""

import logging
import os
from datetime import datetime, timedelta

import httpx

from ..schemas import ScannerResultItem

logger = logging.getLogger("daytradedash.polygon")

POLYGON_BASE_URL = "https://api.polygon.io"
_SNAPSHOT_CACHE_TTL = timedelta(seconds=10)


def _get_api_key() -> str | None:
    return os.getenv("POLYGON_API_KEY")


def polygon_available() -> bool:
    return bool(_get_api_key())


class PolygonDataSource:
    """Fetches pre-market scanner data from Polygon.io snapshot endpoints."""

    def __init__(self):
        self._cache: dict[str, tuple[list[ScannerResultItem], datetime]] = {}

    def _is_cache_valid(self, key: str) -> bool:
        if key not in self._cache:
            return False
        _, cached_at = self._cache[key]
        return datetime.now() < cached_at + _SNAPSHOT_CACHE_TTL

    async def fetch_gainers(self) -> list[ScannerResultItem]:
        """Fetch top gainers from Polygon snapshot."""
        return await self._fetch_snapshot("gainers")

    async def fetch_losers(self) -> list[ScannerResultItem]:
        """Fetch top losers from Polygon snapshot."""
        return await self._fetch_snapshot("losers")

    async def _fetch_snapshot(self, direction: str) -> list[ScannerResultItem]:
        cache_key = f"polygon_{direction}"
        if self._is_cache_valid(cache_key):
            return list(self._cache[cache_key][0])

        api_key = _get_api_key()
        if not api_key:
            return []

        url = f"{POLYGON_BASE_URL}/v2/snapshot/locale/us/markets/stocks/{direction}"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url, params={"apiKey": api_key})
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            logger.error("Polygon %s snapshot failed: %s", direction, exc)
            return []

        items = []
        for ticker_data in data.get("tickers", []):
            item = _snapshot_to_item(ticker_data)
            if item is not None:
                items.append(item)

        self._cache[cache_key] = (items, datetime.now())
        logger.info("Polygon %s: %d results", direction, len(items))
        return list(items)


def _snapshot_to_item(t: dict) -> ScannerResultItem | None:
    """Convert a Polygon snapshot ticker to ScannerResultItem."""
    symbol = t.get("ticker")
    if not symbol:
        return None

    day = t.get("day", {})
    prev_day = t.get("prevDay", {})
    last_quote = t.get("lastQuote", {})
    last_trade = t.get("lastTrade", {})

    price = last_trade.get("p") or day.get("c")
    prev_close = prev_day.get("c")
    if not price or not prev_close:
        return None

    change_pct = t.get("todaysChangePerc")
    volume = day.get("v", 0)
    day_high = day.get("h")
    day_low = day.get("l")
    open_price = day.get("o")

    # Polygon volume is cumulative for the day (including pre-market)
    avg_vol = prev_day.get("v")
    rvol = round(volume / avg_vol, 2) if volume and avg_vol and avg_vol > 0 else None

    gap_pct = round((open_price - prev_close) / prev_close * 100, 2) if open_price and prev_close and prev_close > 0 else None
    pos_range = round((price - day_low) / (day_high - day_low) * 100, 2) if price and day_high and day_low and (day_high - day_low) > 0 else None

    return ScannerResultItem(
        symbol=symbol,
        price=round(price, 2),
        change_from_close_pct=round(change_pct, 2) if change_pct is not None else None,
        volume=int(volume) if volume else 0,
        relative_volume_daily=rvol,
        gap_pct=gap_pct,
        day_high=round(day_high, 2) if day_high else None,
        day_low=round(day_low, 2) if day_low else None,
        open_price=round(open_price, 2) if open_price else None,
        prev_close=round(prev_close, 2) if prev_close else None,
        pos_in_range_pct=pos_range,
        market_cap=None,
        float_shares=None,
    )
