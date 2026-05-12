from datetime import datetime

import pandas as pd

from backend.schemas import ScannerResultItem
from backend.services.market_data_source import MarketDataSource, apply_premarket_chart_metrics, quote_to_item


def test_apply_premarket_chart_metrics_uses_1m_chart_data():
    item = ScannerResultItem(
        symbol="ABCD",
        price=10.00,
        change_from_close_pct=0.0,
        volume=100,
        relative_volume_daily=0.01,
        relative_volume_5min=0.01,
        gap_pct=0.0,
        day_high=10.00,
        day_low=10.00,
        open_price=None,
        prev_close=10.00,
    )
    bars = pd.DataFrame(
        {
            "Open": [10.10, 10.25, 10.70, 10.60],
            "High": [10.30, 10.80, 11.00, 10.75],
            "Low": [10.05, 10.20, 10.50, 10.55],
            "Close": [10.20, 10.75, 10.60, 10.65],
            "Volume": [1_000, 2_000, 3_000, 4_000],
        },
        index=pd.DatetimeIndex(
            [
                datetime(2026, 5, 11, 4, 0),
                datetime(2026, 5, 11, 4, 1),
                datetime(2026, 5, 11, 9, 29),
                datetime(2026, 5, 11, 9, 30),
            ],
            tz="America/New_York",
        ),
    )

    updated = apply_premarket_chart_metrics(item, bars, avg_volume_10d=100_000, elapsed_minutes=10)

    assert updated.price == 10.60
    assert updated.change_from_close_pct == 6.0
    assert updated.gap_pct == 6.0
    assert updated.volume == 6_000
    assert updated.relative_volume_daily == 0.06
    assert updated.relative_volume_5min == 2.34
    assert updated.day_high == 11.00
    assert updated.day_low == 10.05
    assert updated.open_price == 10.10
    assert updated.pos_in_range_pct == 57.89


def test_apply_premarket_chart_metrics_keeps_item_when_no_premarket_bars():
    item = ScannerResultItem(symbol="ABCD", price=10.00, prev_close=10.00, volume=100)
    bars = pd.DataFrame(
        {
            "Open": [10.10],
            "High": [10.30],
            "Low": [10.05],
            "Close": [10.20],
            "Volume": [1_000],
        },
        index=pd.DatetimeIndex([datetime(2026, 5, 11, 9, 30)], tz="America/New_York"),
    )

    updated = apply_premarket_chart_metrics(item, bars, avg_volume_10d=100_000, elapsed_minutes=10)

    assert updated == item


def test_quote_to_item_premarket_uses_premarket_price_for_change():
    """During pre-market, chg% should be computed from preMarketPrice vs prev_close,
    not from stale regularMarketChangePercent (which is yesterday's value)."""
    quote = {
        "symbol": "TEST",
        "marketState": "PRE",
        "preMarketPrice": 12.00,
        "regularMarketPrice": 10.00,
        "regularMarketPreviousClose": 10.00,
        "regularMarketChangePercent": 5.0,  # stale — yesterday's change
        "regularMarketDayHigh": 10.50,  # stale
        "regularMarketDayLow": 9.80,  # stale
        "regularMarketOpen": 10.10,  # stale
        "regularMarketVolume": 1_000_000,  # stale
        "preMarketVolume": 50_000,
        "averageDailyVolume10Day": 500_000,
        "sharesOutstanding": 10_000_000,
        "marketCap": 120_000_000,
    }
    item = quote_to_item(quote)
    assert item is not None
    assert item.price == 12.00
    # chg% should be (12 - 10) / 10 * 100 = 20%, NOT stale 5%
    assert item.change_from_close_pct == 20.0
    # HOD should be pre-market price, not stale 10.50
    assert item.day_high == 12.00
    # Volume should be pre-market volume, not stale 1M
    assert item.volume == 50_000
    # gap_pct should match change_from_close_pct during pre-market
    assert item.gap_pct == 20.0


def test_quote_to_item_regular_market_unchanged():
    """During regular hours, behavior should be the same as before."""
    quote = {
        "symbol": "TEST",
        "marketState": "REGULAR",
        "regularMarketPrice": 10.50,
        "regularMarketPreviousClose": 10.00,
        "regularMarketChangePercent": 5.0,
        "regularMarketDayHigh": 10.80,
        "regularMarketDayLow": 9.90,
        "regularMarketOpen": 10.10,
        "regularMarketVolume": 1_000_000,
        "averageDailyVolume10Day": 500_000,
        "sharesOutstanding": 10_000_000,
        "marketCap": 105_000_000,
    }
    item = quote_to_item(quote)
    assert item is not None
    assert item.price == 10.50
    assert item.change_from_close_pct == 5.0
    assert item.day_high == 10.80
    assert item.day_low == 9.90
    assert item.volume == 1_000_000


def test_extract_symbol_chart_from_yfinance_multi_ticker_download():
    data = pd.DataFrame(
        {
            ("ABCD", "Open"): [10.0],
            ("ABCD", "Close"): [10.2],
            ("WXYZ", "Open"): [20.0],
            ("WXYZ", "Close"): [20.4],
        },
        index=pd.DatetimeIndex([datetime(2026, 5, 11, 4, 0)], tz="America/New_York"),
    )

    chart = MarketDataSource._extract_symbol_chart(data, "WXYZ")

    assert chart is not None
    assert list(chart.columns) == ["Open", "Close"]
    assert chart["Close"].iloc[0] == 20.4
