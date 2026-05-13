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
    not from stale regularMarketChangePercent (which is yesterday's value).
    Volume is 0 initially — chart enrichment fills it from actual 1m bars."""
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
    # Volume starts at 0 — chart enrichment fills actual pre-market volume
    assert item.volume == 0
    # gap_pct should match change_from_close_pct during pre-market
    assert item.gap_pct == 20.0


def test_quote_to_item_premarket_chg_baseline_is_regularmarketprice():
    """During PRE state, change% must be vs regularMarketPrice (yesterday's
    close), NOT regularMarketPreviousClose (two days ago). Yahoo's own
    preMarketChangePercent field uses regularMarketPrice as baseline; we
    match that semantics so chg displayed matches Yahoo's quote."""
    quote = {
        "symbol": "TEST",
        "marketState": "PRE",
        "preMarketPrice": 2.00,
        "regularMarketPrice": 1.50,            # yesterday's close
        "regularMarketPreviousClose": 1.00,    # day-before-yesterday's close
        "averageDailyVolume10Day": 500_000,
        "sharesOutstanding": 10_000_000,
    }
    item = quote_to_item(quote)
    assert item is not None
    # Correct: (2.00 - 1.50) / 1.50 * 100 = 33.33%
    # Wrong (old behavior): (2.00 - 1.00) / 1.00 * 100 = 100.00%
    assert item.change_from_close_pct == 33.33
    assert item.prev_close == 1.50


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


def test_premarket_chart_enrichment_sets_volume_from_bars():
    """Chart enrichment should set volume from actual pre-market bars,
    replacing the initial volume=0 from quote_to_item during PRE."""
    item = ScannerResultItem(
        symbol="BZFD",
        price=1.40,
        change_from_close_pct=20.0,
        volume=0,  # initial value from quote_to_item during PRE
        day_high=1.40,
        day_low=1.40,
        prev_close=0.75,
    )
    bars = pd.DataFrame(
        {
            "Open": [0.80, 1.00, 1.30],
            "High": [1.00, 1.35, 1.45],
            "Low": [0.78, 0.95, 1.25],
            "Close": [0.95, 1.30, 1.40],
            "Volume": [500_000, 3_000_000, 2_000_000],
        },
        index=pd.DatetimeIndex(
            [
                datetime(2026, 5, 12, 4, 0),
                datetime(2026, 5, 12, 5, 30),
                datetime(2026, 5, 12, 6, 0),
            ],
            tz="America/New_York",
        ),
    )

    updated = apply_premarket_chart_metrics(item, bars, avg_volume_10d=1_000_000, elapsed_minutes=120)

    # Volume should be sum of all pre-market bars
    assert updated.volume == 5_500_000
    # Price from latest bar
    assert updated.price == 1.40
    # HOD from max of all bars
    assert updated.day_high == 1.45
    # Change from prev_close
    assert updated.change_from_close_pct == 86.67  # (1.40 - 0.75) / 0.75 * 100


def test_premarket_items_without_chart_bars_have_zero_volume():
    """Stocks without actual pre-market trading keep volume=0,
    so premarket_post_filter can exclude them."""
    item = ScannerResultItem(
        symbol="STALE",
        price=5.00,
        change_from_close_pct=10.0,
        volume=0,
        prev_close=4.55,
    )
    # Bars from regular hours only (9:30+), no pre-market bars
    bars = pd.DataFrame(
        {
            "Open": [5.10],
            "High": [5.30],
            "Low": [5.05],
            "Close": [5.20],
            "Volume": [100_000],
        },
        index=pd.DatetimeIndex([datetime(2026, 5, 12, 9, 30)], tz="America/New_York"),
    )

    updated = apply_premarket_chart_metrics(item, bars, avg_volume_10d=500_000, elapsed_minutes=10)

    # No pre-market bars → item unchanged, volume stays 0
    assert updated.volume == 0


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
