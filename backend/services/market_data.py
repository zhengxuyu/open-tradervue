"""
Market data service for fetching and calculating technical indicators.
Uses yfinance for historical data, falls back to calculating from trades.
"""
import os
from datetime import datetime, date, timedelta
from typing import Optional
from collections import defaultdict
import yfinance as yf
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from ..models.market_data import DailyMarketData, SymbolInfo
from ..models.trade import Trade


class MarketDataService:
    """Service for fetching market data and calculating indicators."""

    async def get_market_data_for_date(
        self,
        db: AsyncSession,
        symbol: str,
        trade_date: date
    ) -> Optional[DailyMarketData]:
        """Get market data for a specific symbol and date."""
        query = select(DailyMarketData).where(
            DailyMarketData.symbol == symbol.upper(),
            DailyMarketData.date == trade_date
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def fetch_and_store_market_data(
        self,
        db: AsyncSession,
        symbol: str,
        force_refresh: bool = False
    ) -> int:
        """
        Fetch market data from yfinance and store in database.
        Falls back to calculating from trades if yfinance has no data.
        Returns number of records stored.
        """
        symbol = symbol.upper()

        # Check if we already have recent data
        if not force_refresh:
            query = select(DailyMarketData).where(
                DailyMarketData.symbol == symbol
            ).order_by(DailyMarketData.date.desc()).limit(1)
            result = await db.execute(query)
            latest = result.scalar_one_or_none()

            if latest and (date.today() - latest.date).days < 1:
                return 0

        # Try yfinance first
        daily_data = self._fetch_daily_data_yfinance(symbol)
        if daily_data is not None and not daily_data.empty:
            records_stored = await self._process_and_store(db, symbol, daily_data)
            return records_stored

        # Fallback: calculate from trades
        print(f"No yfinance data for {symbol}, calculating from trades...")
        records_stored = await self._calculate_from_trades(db, symbol)
        return records_stored

    def _fetch_daily_data_yfinance(self, symbol: str):
        """Fetch daily OHLCV data from yfinance."""
        try:
            ticker = yf.Ticker(symbol)
            # Get 1 year of daily data
            df = ticker.history(period="1y")
            if df.empty:
                return None
            return df
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            return None

    async def _calculate_from_trades(
        self,
        db: AsyncSession,
        symbol: str
    ) -> int:
        """Calculate market data from trade records when external data unavailable."""
        # Get all trades for this symbol grouped by date
        query = select(Trade).where(Trade.symbol == symbol).order_by(Trade.executed_at)
        result = await db.execute(query)
        trades = result.scalars().all()

        if not trades:
            print(f"No trades found for {symbol}")
            return 0

        # Group trades by date
        daily_trades = defaultdict(list)
        for trade in trades:
            trade_date = trade.executed_at.date()
            daily_trades[trade_date].append(trade)

        # Sort dates
        sorted_dates = sorted(daily_trades.keys())
        records = []

        # Calculate daily metrics
        for i, trade_date in enumerate(sorted_dates):
            day_trades = daily_trades[trade_date]

            prices = [t.price for t in day_trades]
            volumes = [t.quantity for t in day_trades]

            # Estimate OHLC from trades
            # First trade price as open, last as close
            sorted_day_trades = sorted(day_trades, key=lambda t: t.executed_at)
            open_price = sorted_day_trades[0].price
            close_price = sorted_day_trades[-1].price
            high = max(prices)
            low = min(prices)
            volume = sum(volumes)

            # Calculate volume 50MA from previous days
            volume_50ma = None
            if i >= 50:
                prev_volumes = []
                for j in range(max(0, i-50), i):
                    prev_date = sorted_dates[j]
                    prev_vol = sum(t.quantity for t in daily_trades[prev_date])
                    prev_volumes.append(prev_vol)
                if prev_volumes:
                    volume_50ma = sum(prev_volumes) / len(prev_volumes)

            # Calculate SMA 50 from previous closes
            sma_50 = None
            if i >= 50:
                prev_closes = []
                for j in range(max(0, i-50), i):
                    prev_date = sorted_dates[j]
                    prev_trades = sorted(daily_trades[prev_date], key=lambda t: t.executed_at)
                    prev_closes.append(prev_trades[-1].price)
                if prev_closes:
                    sma_50 = sum(prev_closes) / len(prev_closes)

            # Calculate ATR 14
            atr_14 = None
            if i >= 14:
                tr_values = []
                for j in range(max(0, i-13), i+1):
                    curr_date = sorted_dates[j]
                    curr_trades = daily_trades[curr_date]
                    curr_prices = [t.price for t in curr_trades]
                    curr_high = max(curr_prices)
                    curr_low = min(curr_prices)

                    if j > 0:
                        prev_date = sorted_dates[j-1]
                        prev_trades = sorted(daily_trades[prev_date], key=lambda t: t.executed_at)
                        prev_close = prev_trades[-1].price
                        tr = max(curr_high - curr_low, abs(curr_high - prev_close), abs(curr_low - prev_close))
                    else:
                        tr = curr_high - curr_low
                    tr_values.append(tr)
                if tr_values:
                    atr_14 = sum(tr_values) / len(tr_values)

            # Calculate gap %
            gap_pct = None
            if i > 0:
                prev_date = sorted_dates[i-1]
                prev_trades = sorted(daily_trades[prev_date], key=lambda t: t.executed_at)
                prev_close = prev_trades[-1].price
                if prev_close > 0:
                    gap_pct = ((open_price - prev_close) / prev_close) * 100

            # Calculate day range %
            day_range_pct = None
            if open_price > 0:
                day_range_pct = ((high - low) / open_price) * 100

            # Calculate true range
            true_range = high - low
            if i > 0:
                prev_date = sorted_dates[i-1]
                prev_trades = sorted(daily_trades[prev_date], key=lambda t: t.executed_at)
                prev_close = prev_trades[-1].price
                true_range = max(high - low, abs(high - prev_close), abs(low - prev_close))

            # Classify day type
            day_type = self._classify_day_type(open_price, high, low, close_price)

            records.append({
                "symbol": symbol,
                "date": trade_date,
                "open": round(open_price, 4),
                "high": round(high, 4),
                "low": round(low, 4),
                "close": round(close_price, 4),
                "volume": volume,
                "volume_50ma": round(volume_50ma, 2) if volume_50ma else None,
                "sma_50": round(sma_50, 4) if sma_50 else None,
                "atr_14": round(atr_14, 4) if atr_14 else None,
                "gap_pct": round(gap_pct, 2) if gap_pct is not None else None,
                "day_range_pct": round(day_range_pct, 2) if day_range_pct else None,
                "true_range": round(true_range, 4) if true_range else None,
                "day_type": day_type,
            })

        # Store records
        if records:
            for record in records:
                stmt = sqlite_insert(DailyMarketData).values(**record)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['symbol', 'date'],
                    set_={
                        'open': stmt.excluded.open,
                        'high': stmt.excluded.high,
                        'low': stmt.excluded.low,
                        'close': stmt.excluded.close,
                        'volume': stmt.excluded.volume,
                        'volume_50ma': stmt.excluded.volume_50ma,
                        'sma_50': stmt.excluded.sma_50,
                        'atr_14': stmt.excluded.atr_14,
                        'gap_pct': stmt.excluded.gap_pct,
                        'day_range_pct': stmt.excluded.day_range_pct,
                        'true_range': stmt.excluded.true_range,
                        'day_type': stmt.excluded.day_type,
                    }
                )
                await db.execute(stmt)

            await db.commit()
            print(f"Calculated and stored {len(records)} records for {symbol} from trades")

        return len(records)

    async def _process_and_store(
        self,
        db: AsyncSession,
        symbol: str,
        df
    ) -> int:
        """Process yfinance data, calculate indicators, and store."""
        if df is None or df.empty:
            return 0

        records = []
        df = df.reset_index()

        for i in range(len(df)):
            try:
                row = df.iloc[i]
                trade_date = row['Date'].date() if hasattr(row['Date'], 'date') else row['Date']

                open_price = float(row['Open'])
                high = float(row['High'])
                low = float(row['Low'])
                close = float(row['Close'])
                volume = float(row['Volume'])

                # Calculate volume 50MA (using previous 50 days)
                volume_50ma = None
                if i >= 50:
                    volumes = df.iloc[i-50:i]['Volume'].values
                    volume_50ma = float(volumes.mean())

                # Calculate SMA 50
                sma_50 = None
                if i >= 50:
                    closes = df.iloc[i-50:i]['Close'].values
                    sma_50 = float(closes.mean())

                # Calculate ATR 14
                atr_14 = None
                if i >= 14:
                    tr_values = []
                    for j in range(i-13, i+1):
                        curr = df.iloc[j]
                        if j > 0:
                            prev = df.iloc[j-1]
                            h = float(curr['High'])
                            l = float(curr['Low'])
                            prev_c = float(prev['Close'])
                            tr = max(h - l, abs(h - prev_c), abs(l - prev_c))
                        else:
                            tr = float(curr['High']) - float(curr['Low'])
                        tr_values.append(tr)
                    atr_14 = sum(tr_values) / len(tr_values)

                # Calculate gap %
                gap_pct = None
                if i > 0:
                    prev_close = float(df.iloc[i-1]['Close'])
                    if prev_close > 0:
                        gap_pct = ((open_price - prev_close) / prev_close) * 100

                # Calculate day range %
                day_range_pct = None
                if open_price > 0:
                    day_range_pct = ((high - low) / open_price) * 100

                # Calculate true range
                true_range = None
                if i > 0:
                    prev_close = float(df.iloc[i-1]['Close'])
                    true_range = max(high - low, abs(high - prev_close), abs(low - prev_close))
                else:
                    true_range = high - low

                # Classify day type
                day_type = self._classify_day_type(open_price, high, low, close)

                records.append({
                    "symbol": symbol,
                    "date": trade_date,
                    "open": round(open_price, 4),
                    "high": round(high, 4),
                    "low": round(low, 4),
                    "close": round(close, 4),
                    "volume": volume,
                    "volume_50ma": round(volume_50ma, 2) if volume_50ma else None,
                    "sma_50": round(sma_50, 4) if sma_50 else None,
                    "atr_14": round(atr_14, 4) if atr_14 else None,
                    "gap_pct": round(gap_pct, 2) if gap_pct is not None else None,
                    "day_range_pct": round(day_range_pct, 2) if day_range_pct else None,
                    "true_range": round(true_range, 4) if true_range else None,
                    "day_type": day_type,
                })

            except Exception as e:
                print(f"Error processing {symbol} row {i}: {e}")
                continue

        # Bulk upsert
        if records:
            for record in records:
                stmt = sqlite_insert(DailyMarketData).values(**record)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['symbol', 'date'],
                    set_={
                        'open': stmt.excluded.open,
                        'high': stmt.excluded.high,
                        'low': stmt.excluded.low,
                        'close': stmt.excluded.close,
                        'volume': stmt.excluded.volume,
                        'volume_50ma': stmt.excluded.volume_50ma,
                        'sma_50': stmt.excluded.sma_50,
                        'atr_14': stmt.excluded.atr_14,
                        'gap_pct': stmt.excluded.gap_pct,
                        'day_range_pct': stmt.excluded.day_range_pct,
                        'true_range': stmt.excluded.true_range,
                        'day_type': stmt.excluded.day_type,
                    }
                )
                await db.execute(stmt)

            await db.commit()
            print(f"Stored {len(records)} records for {symbol}")

        return len(records)

    def _classify_day_type(
        self,
        open_price: float,
        high: float,
        low: float,
        close: float
    ) -> str:
        """Classify the type of trading day."""
        if open_price <= 0:
            return "unknown"

        range_size = high - low
        body_size = abs(close - open_price)

        if range_size <= 0:
            return "unknown"

        upper_wick = high - max(open_price, close)
        lower_wick = min(open_price, close) - low

        # Trend day: body is > 60% of range
        if body_size / range_size > 0.6:
            return "trend_up" if close > open_price else "trend_down"

        # Reversal: long wick on one side
        if upper_wick / range_size > 0.4 and close < open_price:
            return "reversal_down"
        if lower_wick / range_size > 0.4 and close > open_price:
            return "reversal_up"

        # Range day
        return "range"

    async def fetch_market_data_for_symbols(
        self,
        db: AsyncSession,
        symbols: list[str]
    ) -> dict[str, int]:
        """Fetch market data for multiple symbols. Returns count per symbol."""
        results = {}
        for symbol in symbols:
            try:
                count = await self.fetch_and_store_market_data(db, symbol)
                results[symbol] = count
                print(f"Fetched {count} records for {symbol}")

                # Also fetch symbol info (float, etc.)
                await self.fetch_and_store_symbol_info(db, symbol)
            except Exception as e:
                print(f"Error fetching {symbol}: {e}")
                results[symbol] = 0
        return results

    async def get_symbol_info(
        self,
        db: AsyncSession,
        symbol: str
    ) -> Optional[SymbolInfo]:
        """Get symbol info from database."""
        query = select(SymbolInfo).where(SymbolInfo.symbol == symbol.upper())
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def fetch_and_store_symbol_info(
        self,
        db: AsyncSession,
        symbol: str,
        force_refresh: bool = False
    ) -> Optional[SymbolInfo]:
        """
        Fetch symbol info (float, market cap, etc.) from yfinance and store.
        Returns the SymbolInfo record.
        """
        symbol = symbol.upper()

        # Check if we already have data (and it's recent enough)
        if not force_refresh:
            existing = await self.get_symbol_info(db, symbol)
            if existing and existing.float_shares is not None:
                # Already have float data
                return existing

        # Fetch from yfinance
        info = self._fetch_symbol_info_yfinance(symbol)
        if info is None:
            print(f"Could not fetch symbol info for {symbol}")
            return None

        # Upsert the record
        stmt = sqlite_insert(SymbolInfo).values(
            symbol=symbol,
            float_shares=info.get('float_shares'),
            shares_outstanding=info.get('shares_outstanding'),
            float_percent=info.get('float_percent'),
            market_cap=info.get('market_cap'),
            avg_volume_10d=info.get('avg_volume_10d'),
            sector=info.get('sector'),
            industry=info.get('industry'),
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=['symbol'],
            set_={
                'float_shares': stmt.excluded.float_shares,
                'shares_outstanding': stmt.excluded.shares_outstanding,
                'float_percent': stmt.excluded.float_percent,
                'market_cap': stmt.excluded.market_cap,
                'avg_volume_10d': stmt.excluded.avg_volume_10d,
                'sector': stmt.excluded.sector,
                'industry': stmt.excluded.industry,
            }
        )
        await db.execute(stmt)
        await db.commit()

        print(f"Stored symbol info for {symbol}: float={info.get('float_shares')}")

        # Return the updated record
        return await self.get_symbol_info(db, symbol)

    def _fetch_symbol_info_yfinance(self, symbol: str) -> Optional[dict]:
        """Fetch symbol info from yfinance."""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            if not info:
                return None

            float_shares = info.get('floatShares')
            shares_outstanding = info.get('sharesOutstanding')

            # Calculate float percent
            float_percent = None
            if float_shares and shares_outstanding and shares_outstanding > 0:
                float_percent = round((float_shares / shares_outstanding) * 100, 2)

            return {
                'float_shares': float_shares,
                'shares_outstanding': shares_outstanding,
                'float_percent': float_percent,
                'market_cap': info.get('marketCap'),
                'avg_volume_10d': info.get('averageVolume10days'),
                'sector': info.get('sector'),
                'industry': info.get('industry'),
            }
        except Exception as e:
            print(f"Error fetching symbol info for {symbol}: {e}")
            return None

    async def fetch_symbol_info_for_symbols(
        self,
        db: AsyncSession,
        symbols: list[str]
    ) -> dict[str, bool]:
        """Fetch symbol info for multiple symbols. Returns success status per symbol."""
        results = {}
        for symbol in symbols:
            try:
                info = await self.fetch_and_store_symbol_info(db, symbol)
                results[symbol] = info is not None
            except Exception as e:
                print(f"Error fetching symbol info for {symbol}: {e}")
                results[symbol] = False
        return results


# Singleton instance
market_data_service = MarketDataService()
