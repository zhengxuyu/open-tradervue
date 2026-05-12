from backend.services.polygon import _snapshot_to_item


def test_snapshot_to_item_converts_polygon_ticker():
    """Polygon snapshot ticker data should convert to ScannerResultItem with
    correct price, change%, volume, and HOD."""
    ticker = {
        "ticker": "BZFD",
        "todaysChangePerc": 91.81,
        "todaysChange": 0.65,
        "day": {"o": 0.80, "h": 1.45, "l": 0.72, "c": 1.40, "v": 6_490_000},
        "prevDay": {"o": 0.70, "h": 0.78, "l": 0.68, "c": 0.75, "v": 500_000},
        "lastTrade": {"p": 1.40, "s": 100},
        "lastQuote": {"P": 1.41, "S": 200, "p": 1.39, "s": 300},
    }

    item = _snapshot_to_item(ticker)

    assert item is not None
    assert item.symbol == "BZFD"
    assert item.price == 1.40
    assert item.change_from_close_pct == 91.81
    assert item.volume == 6_490_000
    assert item.day_high == 1.45
    assert item.day_low == 0.72
    assert item.open_price == 0.80
    assert item.prev_close == 0.75
    # rvol = day volume / prev day volume = 6.49M / 500K = 12.98
    assert item.relative_volume_daily == 12.98


def test_snapshot_to_item_skips_missing_price():
    """Should return None when price data is missing."""
    ticker = {"ticker": "BAD", "day": {}, "prevDay": {}, "lastTrade": {}}
    assert _snapshot_to_item(ticker) is None


def test_snapshot_to_item_handles_no_last_trade():
    """Falls back to day close when lastTrade is missing."""
    ticker = {
        "ticker": "TEST",
        "todaysChangePerc": 5.0,
        "day": {"o": 10.0, "h": 11.0, "l": 9.5, "c": 10.50, "v": 1_000_000},
        "prevDay": {"c": 10.00, "v": 800_000},
        "lastTrade": {},
    }

    item = _snapshot_to_item(ticker)

    assert item is not None
    assert item.price == 10.50  # falls back to day.c
    assert item.change_from_close_pct == 5.0
