import yfinance as yf
from datetime import datetime, timedelta
from typing import Optional
import asyncio
from functools import partial

from ..schemas import KlineData


class YahooFinanceService:
    """Service to fetch market data from Yahoo Finance."""

    def __init__(self):
        self._cache: dict[str, list[KlineData]] = {}
        self._cache_expiry: dict[str, datetime] = {}

    def _get_cache_key(self, symbol: str, interval: str, period: str) -> str:
        return f"{symbol}_{interval}_{period}"

    def _is_cache_valid(self, cache_key: str) -> bool:
        if cache_key not in self._cache_expiry:
            return False
        return datetime.now() < self._cache_expiry[cache_key]

    def _fetch_data_sync(
        self,
        symbol: str,
        period: str = "3mo",
        interval: str = "1d"
    ) -> list[KlineData]:
        """Synchronous data fetch - will be run in executor."""
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)

            if df.empty:
                return []

            klines = []
            for timestamp, row in df.iterrows():
                klines.append(KlineData(
                    timestamp=timestamp.to_pydatetime().replace(tzinfo=None),
                    open=float(row['Open']),
                    high=float(row['High']),
                    low=float(row['Low']),
                    close=float(row['Close']),
                    volume=int(row['Volume'])
                ))

            return klines
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            return []

    async def get_kline(
        self,
        symbol: str,
        interval: str = "daily",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> list[KlineData]:
        """Get K-line data for a symbol."""
        # Map interval to Yahoo Finance format
        yf_interval = "1d"
        if interval == "1min":
            yf_interval = "1m"
        elif interval == "5min":
            yf_interval = "5m"
        elif interval == "15min":
            yf_interval = "15m"
        elif interval == "30min":
            yf_interval = "30m"
        elif interval == "60min" or interval == "1h":
            yf_interval = "1h"
        elif interval == "daily" or interval == "1d":
            yf_interval = "1d"
        elif interval == "weekly" or interval == "1wk":
            yf_interval = "1wk"
        elif interval == "monthly" or interval == "1mo":
            yf_interval = "1mo"

        # Determine period based on interval
        if yf_interval in ["1m", "5m", "15m", "30m"]:
            period = "7d"
        elif yf_interval == "1h":
            period = "1mo"
        else:
            period = "1y"

        cache_key = self._get_cache_key(symbol, yf_interval, period)

        if self._is_cache_valid(cache_key):
            klines = self._cache[cache_key]
        else:
            # Run synchronous yfinance call in thread executor
            loop = asyncio.get_event_loop()
            klines = await loop.run_in_executor(
                None,
                partial(self._fetch_data_sync, symbol, period, yf_interval)
            )

            if klines:
                self._cache[cache_key] = klines
                # Cache for 5 minutes for intraday, 15 minutes for daily
                cache_minutes = 5 if yf_interval in ["1m", "5m", "15m", "30m", "1h"] else 15
                self._cache_expiry[cache_key] = datetime.now() + timedelta(minutes=cache_minutes)

        # Filter by date range if specified
        if start_date:
            klines = [k for k in klines if k.timestamp >= start_date]
        if end_date:
            klines = [k for k in klines if k.timestamp <= end_date]

        return klines

    async def get_daily(
        self,
        symbol: str,
        outputsize: str = "compact"
    ) -> list[KlineData]:
        """Get daily K-line data - compatibility method."""
        period = "3mo" if outputsize == "compact" else "1y"
        cache_key = self._get_cache_key(symbol, "1d", period)

        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        loop = asyncio.get_event_loop()
        klines = await loop.run_in_executor(
            None,
            partial(self._fetch_data_sync, symbol, period, "1d")
        )

        if klines:
            self._cache[cache_key] = klines
            self._cache_expiry[cache_key] = datetime.now() + timedelta(minutes=15)

        return klines
