"""All scanner definitions. Each scanner is a class inheriting BaseScanner.

To add a new scanner:
  1. Create a class inheriting BaseScanner
  2. Set id, name, description
  3. Implement build_query()
  4. The scanner is auto-registered via the registry module
"""

import yfinance as yf

from .base import BaseScanner, BaseAlertScanner
from ..market_data_source import MarketDataSource, us_equity
from ...schemas import ScannerResultItem


async def _enrich_with_news(items: list[ScannerResultItem], data_source: MarketDataSource) -> list[ScannerResultItem]:
    """Check news for items: breaking (< 2h) = red, recent (< 24h) = yellow."""
    if not items:
        return items
    symbols = [item.symbol for item in items]
    # Check last 24 hours
    news_map = await data_source.check_news(symbols, hours=24)
    # Check last 2 hours for "breaking"
    breaking_map = await data_source.check_news(symbols, hours=2)
    for item in items:
        if breaking_map.get(item.symbol):
            item.has_news = True
            item.news_type = "breaking"
        elif news_map.get(item.symbol):
            item.has_news = True
            item.news_type = "recent"
    return items


# ── Momentum ─────────────────────────────────────────────────────────────────

class TopGainers(BaseScanner):
    id = "top_gainers"
    name = "Top Gainers"
    description = "Stocks with the highest % gain today"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("gt", ["percentchange", 5]),
            yf.EquityQuery("gt", ["dayvolume", 100_000]),
        )


class TopLosers(BaseScanner):
    id = "top_losers"
    name = "Top Losers"
    description = "Stocks with the biggest % loss today"
    sort_asc = True
    sort_dir = "asc"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("lt", ["percentchange", -5]),
            yf.EquityQuery("gt", ["dayvolume", 100_000]),
        )


class TopGappers(BaseScanner):
    id = "top_gappers"
    name = "Top Gappers"
    description = "Stocks gapping up > 5% with volume > 100K"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("gt", ["percentchange", 5]),
            yf.EquityQuery("gt", ["dayvolume", 100_000]),
        )


class RunningUp(BaseScanner):
    id = "running_up"
    name = "Running Up"
    description = "Stocks surging with strong momentum (> 8%)"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("gt", ["percentchange", 8]),
            yf.EquityQuery("gt", ["dayvolume", 500_000]),
        )


class RunningDown(BaseScanner):
    id = "running_down"
    name = "Running Down"
    description = "Stocks selling off heavily (< -5%)"
    sort_asc = True
    sort_dir = "asc"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("lt", ["percentchange", -5]),
            yf.EquityQuery("gt", ["dayvolume", 500_000]),
        )


# ── Volume ───────────────────────────────────────────────────────────────────

class MostActive(BaseScanner):
    id = "most_active"
    name = "Most Active"
    description = "Highest trading volume today"
    sort_field = "dayvolume"
    sort_by = "volume"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("gt", ["dayvolume", 5_000_000]),
        )


class TopVolume5Min(BaseScanner):
    id = "top_volume_5min"
    name = "Top Volume 5 Minutes"
    description = "Stocks with highest relative volume in the last 5 minutes"
    sort_field = "dayvolume"
    sort_by = "relative_volume_5min"
    sort_dir = "desc"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("gt", ["dayvolume", 500_000]),
            yf.EquityQuery("gt", ["percentchange", 1]),
        )

    def post_filter(self, items):
        # Only show stocks with meaningful 5-min relative volume
        return [item for item in items if item.relative_volume_5min and item.relative_volume_5min >= 2]


class TopRelativeVolume(BaseScanner):
    id = "top_relative_volume"
    name = "Top Relative Volume"
    description = "Stocks with unusually high volume vs 3-month average"
    sort_field = "dayvolume"
    sort_by = "relative_volume_daily"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("gt", ["dayvolume", 1_000_000]),
            yf.EquityQuery("gt", ["percentchange", 2]),
        )


# ── Ross Cameron ─────────────────────────────────────────────────────────────

class Ross5Pillars(BaseScanner):
    id = "ross_5_pillars"
    name = "Ross's 5 Pillars"
    description = "Float < 20M, RelVol(5min) >= 5x, Gap >= 30%, Price $2-$20, News"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("btwn", ["intradayprice", 2, 20]),             # Pillar 4: Price $2-$20
            yf.EquityQuery("gt", ["percentchange", 30]),                   # Pillar 3: Gap >= 30%
            yf.EquityQuery("lt", ["totalsharesoutstanding", 20_000_000]),  # Pillar 1: Float < 20M
            yf.EquityQuery("gt", ["dayvolume", 500_000]),
        )

    def post_filter(self, items):
        # Pillar 2: Relative Volume (5min) >= 5x
        return [item for item in items if item.relative_volume_5min and item.relative_volume_5min >= 5]

    async def enrich(self, items, data_source):
        # Pillar 5: News/Catalyst
        return await _enrich_with_news(items, data_source)


class Ross5PillarsAlert(BaseAlertScanner):
    id = "ross_5_pillars_alert"
    name = "Ross's 5 Pillars Alert"
    description = "Alert when a stock newly meets all 5 Pillars criteria"
    strategy_name = "5 Pillar HOD alert"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("btwn", ["intradayprice", 2, 20]),
            yf.EquityQuery("gt", ["percentchange", 30]),
            yf.EquityQuery("lt", ["totalsharesoutstanding", 20_000_000]),
            yf.EquityQuery("gt", ["dayvolume", 500_000]),
        )

    def post_filter(self, items):
        return [item for item in items if item.relative_volume_5min and item.relative_volume_5min >= 5]

    async def enrich(self, items, data_source):
        return await _enrich_with_news(items, data_source)


# ── Small Cap ────────────────────────────────────────────────────────────────

class SmallCapHODMomentum(BaseScanner):
    id = "hod_momentum"
    name = "Small Cap - HOD Momentum"
    description = "Small cap stocks ($1-$20) with strong momentum"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("btwn", ["intradayprice", 1, 20]),
            yf.EquityQuery("gt", ["percentchange", 5]),
            yf.EquityQuery("gt", ["dayvolume", 200_000]),
            yf.EquityQuery("lt", ["intradaymarketcap", 2_000_000_000]),
        )


class SmallCapGainers(BaseScanner):
    id = "small_cap_gainers"
    name = "Small Cap Gainers"
    description = "Small cap stocks (< $2B) with biggest gains"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("lt", ["intradaymarketcap", 2_000_000_000]),
            yf.EquityQuery("gt", ["percentchange", 3]),
            yf.EquityQuery("gt", ["dayvolume", 100_000]),
        )


class LowFloatGainers(BaseScanner):
    id = "low_float_gainers"
    name = "Low Float Top Gainers"
    description = "Low float stocks (< 20M shares) with big gains"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("lt", ["totalsharesoutstanding", 20_000_000]),
            yf.EquityQuery("gt", ["percentchange", 5]),
            yf.EquityQuery("gt", ["dayvolume", 200_000]),
        )


# ── Large Cap ────────────────────────────────────────────────────────────────

class LargeCapHOD(BaseScanner):
    id = "large_cap_hod"
    name = "Large Cap - HOD Momentum"
    description = "Large cap stocks ($10B+) with strong gains"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("gt", ["intradaymarketcap", 10_000_000_000]),
            yf.EquityQuery("gt", ["percentchange", 2]),
            yf.EquityQuery("gt", ["dayvolume", 1_000_000]),
        )


class LargeCapGappers(BaseScanner):
    id = "large_cap_gappers"
    name = "Large Cap - Top Gappers"
    description = "Large cap stocks gapping up significantly"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("gt", ["intradaymarketcap", 10_000_000_000]),
            yf.EquityQuery("gt", ["percentchange", 3]),
        )


class LargeCapVolume(BaseScanner):
    id = "large_cap_volume"
    name = "Large Cap Highest Volume"
    description = "Large cap stocks with highest volume today"
    sort_field = "dayvolume"
    sort_by = "volume"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("gt", ["intradaymarketcap", 10_000_000_000]),
            yf.EquityQuery("gt", ["dayvolume", 5_000_000]),
        )


# ── Penny ────────────────────────────────────────────────────────────────────

class PennyGainers(BaseScanner):
    id = "penny_gainers"
    name = "Penny - Top Gainers"
    description = "Penny stocks ($0.50-$5) with biggest gains"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("btwn", ["intradayprice", 0.5, 5]),
            yf.EquityQuery("gt", ["percentchange", 10]),
            yf.EquityQuery("gt", ["dayvolume", 500_000]),
        )


class PennyLosers(BaseScanner):
    id = "penny_losers"
    name = "Penny - Top Losers"
    description = "Penny stocks ($0.50-$5) with biggest losses"
    sort_asc = True
    sort_dir = "asc"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("btwn", ["intradayprice", 0.5, 5]),
            yf.EquityQuery("lt", ["percentchange", -10]),
            yf.EquityQuery("gt", ["dayvolume", 500_000]),
        )


# ── Special ──────────────────────────────────────────────────────────────────

class HighShortInterest(BaseScanner):
    id = "high_short_interest"
    name = "High Short Interest"
    description = "Stocks with > 15% short float (squeeze candidates)"
    sort_field = "short_percentage_of_float.value"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("gt", ["short_percentage_of_float.value", 15]),
            yf.EquityQuery("gt", ["dayvolume", 200_000]),
        )


class MostShorted(BaseScanner):
    id = "most_shorted"
    name = "Most Shorted"
    description = "Stocks with highest short interest ratio"
    sort_field = "short_interest.value"

    def build_query(self):
        return us_equity(
            yf.EquityQuery("gt", ["short_interest.value", 10_000_000]),
            yf.EquityQuery("gt", ["dayvolume", 500_000]),
        )
