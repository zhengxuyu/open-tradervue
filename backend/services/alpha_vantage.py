import httpx
import os
from datetime import datetime, timedelta
from typing import Optional
import json

from ..schemas import KlineData


class AlphaVantageService:
    BASE_URL = "https://www.alphavantage.co/query"

    def __init__(self):
        self.api_key = os.getenv("ALPHA_VANTAGE_API_KEY", "demo")
        self._cache: dict[str, dict] = {}
        self._cache_expiry: dict[str, datetime] = {}

    def _get_cache_key(self, symbol: str, interval: str, outputsize: str) -> str:
        return f"{symbol}_{interval}_{outputsize}"

    def _is_cache_valid(self, cache_key: str) -> bool:
        if cache_key not in self._cache_expiry:
            return False
        return datetime.now() < self._cache_expiry[cache_key]

    async def get_intraday(
        self,
        symbol: str,
        interval: str = "5min",
        outputsize: str = "compact"
    ) -> list[KlineData]:
        cache_key = self._get_cache_key(symbol, interval, outputsize)

        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        params = {
            "function": "TIME_SERIES_INTRADAY",
            "symbol": symbol,
            "interval": interval,
            "outputsize": outputsize,
            "apikey": self.api_key
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(self.BASE_URL, params=params)
            data = response.json()

        time_series_key = f"Time Series ({interval})"
        if time_series_key not in data:
            if "Note" in data:
                raise Exception("API rate limit exceeded. Please wait and try again.")
            if "Error Message" in data:
                raise Exception(data["Error Message"])
            return []

        time_series = data[time_series_key]
        klines = []

        for timestamp_str, values in sorted(time_series.items()):
            klines.append(KlineData(
                timestamp=datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S"),
                open=float(values["1. open"]),
                high=float(values["2. high"]),
                low=float(values["3. low"]),
                close=float(values["4. close"]),
                volume=int(values["5. volume"])
            ))

        self._cache[cache_key] = klines
        self._cache_expiry[cache_key] = datetime.now() + timedelta(minutes=5)

        return klines

    async def get_daily(
        self,
        symbol: str,
        outputsize: str = "compact"
    ) -> list[KlineData]:
        cache_key = self._get_cache_key(symbol, "daily", outputsize)

        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        params = {
            "function": "TIME_SERIES_DAILY",
            "symbol": symbol,
            "outputsize": outputsize,
            "apikey": self.api_key
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(self.BASE_URL, params=params)
            data = response.json()

        time_series_key = "Time Series (Daily)"
        if time_series_key not in data:
            if "Note" in data:
                raise Exception("API rate limit exceeded. Please wait and try again.")
            if "Error Message" in data:
                raise Exception(data["Error Message"])
            return []

        time_series = data[time_series_key]
        klines = []

        for date_str, values in sorted(time_series.items()):
            klines.append(KlineData(
                timestamp=datetime.strptime(date_str, "%Y-%m-%d"),
                open=float(values["1. open"]),
                high=float(values["2. high"]),
                low=float(values["3. low"]),
                close=float(values["4. close"]),
                volume=int(values["5. volume"])
            ))

        self._cache[cache_key] = klines
        self._cache_expiry[cache_key] = datetime.now() + timedelta(minutes=15)

        return klines

    async def get_kline(
        self,
        symbol: str,
        interval: str = "daily",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> list[KlineData]:
        if interval == "daily":
            klines = await self.get_daily(symbol, outputsize="full" if start_date else "compact")
        else:
            klines = await self.get_intraday(symbol, interval=interval)

        if start_date:
            klines = [k for k in klines if k.timestamp >= start_date]
        if end_date:
            klines = [k for k in klines if k.timestamp <= end_date]

        return klines
