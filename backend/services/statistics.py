from datetime import datetime, timedelta
from typing import Optional
from collections import defaultdict
import math
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .analysis import AnalysisService
from ..schemas import (
    AnalysisSummary, SymbolDetailedStats, HourlyStats, DayOfWeekStats,
    HoldingTimeStats, PnlRangeStats, AdvancedStatistics, DailyPnlData, StreakData,
    DetailedSummary, MarketConditionStats, RiskRewardAnalysis
)
from ..models.market_data import DailyMarketData, SymbolInfo


class StatisticsService:
    """Service for advanced trading statistics and analysis."""

    DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    HOLDING_TIME_RANGES = [
        (0, 5, "< 5 min"),
        (5, 15, "5-15 min"),
        (15, 30, "15-30 min"),
        (30, 60, "30-60 min"),
        (60, 120, "1-2 hours"),
        (120, 240, "2-4 hours"),
        (240, 480, "4-8 hours"),
        (480, 1440, "8-24 hours"),
        (1440, float('inf'), "> 1 day"),
    ]

    PNL_RANGES = [
        (float('-inf'), -500, "< -$500"),
        (-500, -200, "-$500 to -$200"),
        (-200, -100, "-$200 to -$100"),
        (-100, -50, "-$100 to -$50"),
        (-50, 0, "-$50 to $0"),
        (0, 50, "$0 to $50"),
        (50, 100, "$50 to $100"),
        (100, 200, "$100 to $200"),
        (200, 500, "$200 to $500"),
        (500, float('inf'), "> $500"),
    ]

    # Relative volume ranges (% of 50MA)
    RELATIVE_VOLUME_RANGES = [
        (0, 50, "< 50%"),
        (50, 75, "50-75%"),
        (75, 100, "75-100%"),
        (100, 150, "100-150%"),
        (150, 200, "150-200%"),
        (200, 300, "200-300%"),
        (300, float('inf'), "> 300%"),
    ]

    # Opening gap ranges (%)
    OPENING_GAP_RANGES = [
        (float('-inf'), -5, "< -5%"),
        (-5, -2, "-5% to -2%"),
        (-2, -1, "-2% to -1%"),
        (-1, 0, "-1% to 0%"),
        (0, 1, "0% to 1%"),
        (1, 2, "1% to 2%"),
        (2, 5, "2% to 5%"),
        (5, float('inf'), "> 5%"),
    ]

    # Day movement ranges (%)
    DAY_MOVEMENT_RANGES = [
        (0, 1, "< 1%"),
        (1, 2, "1-2%"),
        (2, 3, "2-3%"),
        (3, 5, "3-5%"),
        (5, 7, "5-7%"),
        (7, 10, "7-10%"),
        (10, float('inf'), "> 10%"),
    ]

    # Entry % of ATR ranges
    ENTRY_ATR_RANGES = [
        (0, 25, "0-25%"),
        (25, 50, "25-50%"),
        (50, 75, "50-75%"),
        (75, 100, "75-100%"),
        (100, 150, "100-150%"),
        (150, float('inf'), "> 150%"),
    ]

    # Relative volatility ranges (TR/ATR %)
    RELATIVE_VOLATILITY_RANGES = [
        (0, 50, "< 50%"),
        (50, 75, "50-75%"),
        (75, 100, "75-100%"),
        (100, 125, "100-125%"),
        (125, 150, "125-150%"),
        (150, 200, "150-200%"),
        (200, float('inf'), "> 200%"),
    ]

    # Price vs 50-day SMA ranges (%)
    PRICE_VS_SMA_RANGES = [
        (float('-inf'), -20, "< -20%"),
        (-20, -10, "-20% to -10%"),
        (-10, -5, "-10% to -5%"),
        (-5, 0, "-5% to 0%"),
        (0, 5, "0% to 5%"),
        (5, 10, "5% to 10%"),
        (10, 20, "10% to 20%"),
        (20, float('inf'), "> 20%"),
    ]

    # Day types
    DAY_TYPES = ["trend_up", "trend_down", "range", "reversal_up", "reversal_down", "unknown"]

    # Entry price ranges
    ENTRY_PRICE_RANGES = [
        (0, 1, "< $1"),
        (1, 2, "$1-2"),
        (2, 5, "$2-5"),
        (5, 10, "$5-10"),
        (10, 20, "$10-20"),
        (20, float('inf'), "$20+"),
    ]

    # Gap from previous close ranges (%)
    GAP_PERCENT_RANGES = [
        (float('-inf'), -10, "< -10%"),
        (-10, -5, "-10% to -5%"),
        (-5, -2, "-5% to -2%"),
        (-2, 0, "-2% to 0%"),
        (0, 2, "0% to 2%"),
        (2, 5, "2% to 5%"),
        (5, 10, "5% to 10%"),
        (10, 20, "10% to 20%"),
        (20, float('inf'), "> 20%"),
    ]

    # Relative volume vs 5-day average ranges (%)
    RELATIVE_VOLUME_5D_RANGES = [
        (0, 50, "< 50%"),
        (50, 100, "50-100%"),
        (100, 150, "100-150%"),
        (150, 200, "150-200%"),
        (200, 300, "200-300%"),
        (300, 500, "300-500%"),
        (500, float('inf'), "> 500%"),
    ]

    # Float (流通股) ranges in millions
    FLOAT_RANGES = [
        (0, 1_000_000, "< 1M"),
        (1_000_000, 5_000_000, "1M-5M"),
        (5_000_000, 10_000_000, "5M-10M"),
        (10_000_000, 20_000_000, "10M-20M"),
        (20_000_000, 50_000_000, "20M-50M"),
        (50_000_000, 100_000_000, "50M-100M"),
        (100_000_000, float('inf'), "> 100M"),
    ]

    async def _enrich_positions_with_market_data(
        self,
        db: AsyncSession,
        positions_with_trades: list
    ) -> None:
        """Enrich positions with market data from database."""
        # Collect all symbol/date combinations we need
        symbol_dates = set()
        symbols = set()
        for p in positions_with_trades:
            entry_date = p.position.entry_time.date()
            symbol_dates.add((p.position.symbol, entry_date))
            symbols.add(p.position.symbol)

        if not symbol_dates:
            return

        # Fetch ALL market data for these symbols (for historical calculations)
        from sqlalchemy import or_
        query = select(DailyMarketData).where(
            DailyMarketData.symbol.in_(list(symbols))
        ).order_by(DailyMarketData.symbol, DailyMarketData.date)
        result = await db.execute(query)
        all_market_data = result.scalars().all()

        # Build lookup dicts
        market_data_map = {}
        symbol_history = defaultdict(list)
        for md in all_market_data:
            market_data_map[(md.symbol, md.date)] = md
            symbol_history[md.symbol].append(md)

        # Sort histories by date
        for sym in symbol_history:
            symbol_history[sym].sort(key=lambda x: x.date)

        # Enrich positions
        for p in positions_with_trades:
            entry_date = p.position.entry_time.date()
            md = market_data_map.get((p.position.symbol, entry_date))

            if md:
                # Set market data fields on position
                p.position.entry_volume = md.volume
                p.position.volume_50ma = md.volume_50ma
                if md.volume_50ma and md.volume_50ma > 0:
                    p.position.relative_volume = round((md.volume / md.volume_50ma) * 100, 1)
                p.position.opening_gap_pct = md.gap_pct
                p.position.day_movement_pct = md.day_range_pct
                p.position.day_type = md.day_type
                p.position.atr_14 = md.atr_14
                p.position.true_range = md.true_range
                p.position.sma_50 = md.sma_50

                # Calculate entry % of ATR
                if md.atr_14 and md.atr_14 > 0 and md.low:
                    entry_from_low = p.position.entry_price - md.low
                    p.position.entry_pct_of_atr = round((entry_from_low / md.atr_14) * 100, 1)

                # Calculate relative volatility
                if md.true_range and md.atr_14 and md.atr_14 > 0:
                    p.position.relative_volatility = round((md.true_range / md.atr_14) * 100, 1)

                # Calculate price vs SMA50
                if md.sma_50 and md.sma_50 > 0:
                    p.position.price_vs_sma50_pct = round(
                        ((p.position.entry_price - md.sma_50) / md.sma_50) * 100, 2
                    )

                # Calculate 5-day relative volume
                history = symbol_history.get(p.position.symbol, [])
                entry_idx = None
                for i, h in enumerate(history):
                    if h.date == entry_date:
                        entry_idx = i
                        break

                if entry_idx is not None and entry_idx >= 5:
                    prev_5_volumes = [history[j].volume for j in range(entry_idx - 5, entry_idx) if history[j].volume]
                    if prev_5_volumes:
                        avg_5d_vol = sum(prev_5_volumes) / len(prev_5_volumes)
                        if avg_5d_vol > 0 and md.volume:
                            p.position.prior_day_rel_volume = round((md.volume / avg_5d_vol) * 100, 1)

        # Fetch symbol info (float, market cap, etc.)
        symbol_info_query = select(SymbolInfo).where(
            SymbolInfo.symbol.in_(list(symbols))
        )
        symbol_info_result = await db.execute(symbol_info_query)
        symbol_infos = symbol_info_result.scalars().all()

        # Build symbol info lookup
        symbol_info_map = {si.symbol: si for si in symbol_infos}

        # Enrich positions with float data
        for p in positions_with_trades:
            si = symbol_info_map.get(p.position.symbol)
            if si:
                p.position.float_shares = si.float_shares
                p.position.shares_outstanding = si.shares_outstanding
                p.position.float_percent = si.float_percent
                p.position.market_cap = si.market_cap

    async def get_advanced_statistics(
        self,
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        symbol: Optional[str] = None
    ) -> AdvancedStatistics:
        """Get comprehensive trading statistics."""
        analysis_service = AnalysisService()

        # Get all positions with trades
        positions_with_trades = await analysis_service.calculate_positions_with_trades(db, symbol)

        # Enrich with market data
        await self._enrich_positions_with_market_data(db, positions_with_trades)

        # Filter by date if specified
        if start_date:
            positions_with_trades = [
                p for p in positions_with_trades
                if p.position.entry_time >= start_date
            ]
        if end_date:
            positions_with_trades = [
                p for p in positions_with_trades
                if p.position.entry_time <= end_date
            ]

        # Only include closed positions for statistics
        closed_positions = [p for p in positions_with_trades if p.position.status == 'closed']

        # Calculate summary
        summary = self._calculate_summary(closed_positions)

        # Calculate detailed summary (Tradervue-style metrics)
        detailed_summary = self._calculate_detailed_summary(closed_positions)

        # Calculate by symbol
        by_symbol = self._calculate_by_symbol(closed_positions)

        # Calculate by hour
        by_hour = self._calculate_by_hour(closed_positions)

        # Calculate by day of week
        by_day_of_week = self._calculate_by_day_of_week(closed_positions)

        # Calculate by holding time
        by_holding_time = self._calculate_by_holding_time(closed_positions)

        # Calculate P&L distribution
        pnl_distribution = self._calculate_pnl_distribution(closed_positions)

        # Calculate daily P&L data
        daily_pnl = self._calculate_daily_pnl(closed_positions)

        # Calculate streak data
        streak_data = self._calculate_streak_data(closed_positions)

        # Generate insights
        insights = self._generate_insights(summary, by_symbol, by_hour, by_day_of_week, by_holding_time, streak_data)

        # Calculate market condition analyses
        by_volume = self._calculate_by_market_condition(
            closed_positions, 'entry_volume',
            [(0, 10000, "< 10K"), (10000, 50000, "10K-50K"), (50000, 100000, "50K-100K"),
             (100000, 500000, "100K-500K"), (500000, 1000000, "500K-1M"), (1000000, float('inf'), "> 1M")]
        )
        by_relative_volume = self._calculate_by_market_condition(
            closed_positions, 'relative_volume', self.RELATIVE_VOLUME_RANGES
        )
        by_prior_day_volume = self._calculate_by_market_condition(
            closed_positions, 'prior_day_rel_volume', self.RELATIVE_VOLUME_RANGES
        )
        by_opening_gap = self._calculate_by_market_condition(
            closed_positions, 'opening_gap_pct', self.OPENING_GAP_RANGES
        )
        by_day_movement = self._calculate_by_market_condition(
            closed_positions, 'day_movement_pct', self.DAY_MOVEMENT_RANGES
        )
        by_day_type = self._calculate_by_day_type(closed_positions)
        by_atr = self._calculate_by_market_condition(
            closed_positions, 'atr_14',
            [(0, 0.5, "< $0.50"), (0.5, 1, "$0.50-$1"), (1, 2, "$1-$2"),
             (2, 5, "$2-$5"), (5, 10, "$5-$10"), (10, float('inf'), "> $10")]
        )
        by_entry_pct_atr = self._calculate_by_market_condition(
            closed_positions, 'entry_pct_of_atr', self.ENTRY_ATR_RANGES
        )
        by_relative_volatility = self._calculate_by_market_condition(
            closed_positions, 'relative_volatility', self.RELATIVE_VOLATILITY_RANGES
        )
        by_price_vs_sma50 = self._calculate_by_market_condition(
            closed_positions, 'price_vs_sma50_pct', self.PRICE_VS_SMA_RANGES
        )

        # Calculate R:R analyses for entry conditions
        by_entry_price = self._calculate_rr_analysis(
            closed_positions, 'entry_price', self.ENTRY_PRICE_RANGES
        )
        by_gap_percent = self._calculate_rr_analysis(
            closed_positions, 'opening_gap_pct', self.GAP_PERCENT_RANGES
        )
        by_relative_volume_5d = self._calculate_rr_analysis(
            closed_positions, 'prior_day_rel_volume', self.RELATIVE_VOLUME_5D_RANGES
        )
        by_float = self._calculate_rr_analysis(
            closed_positions, 'float_shares', self.FLOAT_RANGES
        )

        return AdvancedStatistics(
            summary=summary,
            detailed_summary=detailed_summary,
            by_symbol=by_symbol,
            by_hour=by_hour,
            by_day_of_week=by_day_of_week,
            by_holding_time=by_holding_time,
            pnl_distribution=pnl_distribution,
            daily_pnl=daily_pnl,
            streak_data=streak_data,
            insights=insights,
            by_volume=by_volume,
            by_relative_volume=by_relative_volume,
            by_prior_day_volume=by_prior_day_volume,
            by_opening_gap=by_opening_gap,
            by_day_movement=by_day_movement,
            by_day_type=by_day_type,
            by_atr=by_atr,
            by_entry_pct_atr=by_entry_pct_atr,
            by_relative_volatility=by_relative_volatility,
            by_price_vs_sma50=by_price_vs_sma50,
            by_entry_price=by_entry_price,
            by_gap_percent=by_gap_percent,
            by_relative_volume_5d=by_relative_volume_5d,
            by_float=by_float
        )

    def _calculate_summary(self, positions) -> AnalysisSummary:
        """Calculate overall summary statistics."""
        if not positions:
            return AnalysisSummary(
                total_trades=0, total_pnl=0, total_commission=0, net_pnl=0,
                win_count=0, loss_count=0, win_rate=0, avg_win=0, avg_loss=0,
                profit_factor=0, max_drawdown=0, best_trade=0, worst_trade=0
            )

        pnls = [p.position.pnl for p in positions if p.position.pnl is not None]
        wins = [pnl for pnl in pnls if pnl > 0]
        losses = [pnl for pnl in pnls if pnl < 0]

        total_pnl = sum(pnls)
        total_commission = sum(
            sum(t.commission for t in self._get_trades_for_position(p))
            for p in positions
        )

        win_count = len(wins)
        loss_count = len(losses)
        total_trades = len(pnls)

        return AnalysisSummary(
            total_trades=total_trades,
            total_pnl=round(total_pnl, 2),
            total_commission=round(total_commission, 2),
            net_pnl=round(total_pnl - total_commission, 2),
            win_count=win_count,
            loss_count=loss_count,
            win_rate=round(win_count / total_trades * 100, 2) if total_trades > 0 else 0,
            avg_win=round(sum(wins) / len(wins), 2) if wins else 0,
            avg_loss=round(sum(losses) / len(losses), 2) if losses else 0,
            profit_factor=round(abs(sum(wins) / sum(losses)), 2) if losses and sum(losses) != 0 else 0,
            max_drawdown=self._calculate_max_drawdown(pnls),
            best_trade=max(pnls) if pnls else 0,
            worst_trade=min(pnls) if pnls else 0
        )

    def _get_trades_for_position(self, position_with_trades):
        """Get trades associated with a position."""
        # This is a simplified version - in reality we'd need to fetch trades
        return []

    def _calculate_detailed_summary(self, positions) -> DetailedSummary:
        """Calculate comprehensive Tradervue-style statistics."""
        if not positions:
            return DetailedSummary(
                total_gain_loss=0, largest_gain=0, largest_loss=0,
                avg_daily_pnl=0, avg_daily_volume=0, trading_days=0,
                avg_per_share_pnl=0, avg_trade_pnl=0, avg_winning_trade=0, avg_losing_trade=0,
                total_trades=0, winning_trades=0, winning_pct=0, losing_trades=0, losing_pct=0,
                scratch_trades=0, scratch_pct=0,
                avg_hold_time_all=0, avg_hold_time_scratch=0, avg_hold_time_winning=0, avg_hold_time_losing=0,
                max_consecutive_wins=0, max_consecutive_losses=0,
                pnl_std_dev=0, profit_factor=0,
                total_commissions=0, total_fees=0
            )

        pnls = [p.position.pnl for p in positions if p.position.pnl is not None]
        if not pnls:
            return DetailedSummary(
                total_gain_loss=0, largest_gain=0, largest_loss=0,
                avg_daily_pnl=0, avg_daily_volume=0, trading_days=0,
                avg_per_share_pnl=0, avg_trade_pnl=0, avg_winning_trade=0, avg_losing_trade=0,
                total_trades=0, winning_trades=0, winning_pct=0, losing_trades=0, losing_pct=0,
                scratch_trades=0, scratch_pct=0,
                avg_hold_time_all=0, avg_hold_time_scratch=0, avg_hold_time_winning=0, avg_hold_time_losing=0,
                max_consecutive_wins=0, max_consecutive_losses=0,
                pnl_std_dev=0, profit_factor=0,
                total_commissions=0, total_fees=0
            )

        # Categorize trades
        SCRATCH_THRESHOLD = 1.0  # Trades with |P&L| < $1 are scratch
        winning = [p for p in positions if p.position.pnl and p.position.pnl > SCRATCH_THRESHOLD]
        losing = [p for p in positions if p.position.pnl and p.position.pnl < -SCRATCH_THRESHOLD]
        scratch = [p for p in positions if p.position.pnl is not None and abs(p.position.pnl) <= SCRATCH_THRESHOLD]

        total_trades = len(pnls)
        total_pnl = sum(pnls)
        total_volume = sum(p.position.quantity for p in positions)

        # Daily aggregation
        daily_data = defaultdict(lambda: {"pnl": 0, "volume": 0})
        for p in positions:
            if p.position.exit_time:
                date = p.position.exit_time.strftime("%Y-%m-%d")
                daily_data[date]["pnl"] += p.position.pnl or 0
                daily_data[date]["volume"] += p.position.quantity
        trading_days = len(daily_data)

        # Calculate hold times
        def get_hold_time_minutes(pos_list):
            times = []
            for p in pos_list:
                if p.position.exit_time and p.position.entry_time:
                    delta = p.position.exit_time - p.position.entry_time
                    times.append(delta.total_seconds() / 60)
            return sum(times) / len(times) if times else 0

        # Calculate streaks
        sorted_positions = sorted(
            [p for p in positions if p.position.exit_time and p.position.pnl is not None],
            key=lambda p: p.position.exit_time
        )

        max_win_streak = 0
        max_loss_streak = 0
        current_win = 0
        current_loss = 0
        for p in sorted_positions:
            pnl = p.position.pnl
            if pnl > SCRATCH_THRESHOLD:
                current_win += 1
                current_loss = 0
                max_win_streak = max(max_win_streak, current_win)
            elif pnl < -SCRATCH_THRESHOLD:
                current_loss += 1
                current_win = 0
                max_loss_streak = max(max_loss_streak, current_loss)
            else:
                # Scratch trade doesn't break streak
                pass

        # Calculate standard deviation
        mean_pnl = total_pnl / total_trades
        variance = sum((pnl - mean_pnl) ** 2 for pnl in pnls) / total_trades
        std_dev = math.sqrt(variance)

        # Calculate SQN (System Quality Number) = (expectancy / std_dev) * sqrt(n)
        sqn = None
        if std_dev > 0 and total_trades >= 30:
            expectancy = mean_pnl
            sqn = (expectancy / std_dev) * math.sqrt(total_trades)

        # Calculate Kelly Percentage
        kelly = None
        winning_pnls = [p.position.pnl for p in winning if p.position.pnl]
        losing_pnls = [abs(p.position.pnl) for p in losing if p.position.pnl]
        if winning_pnls and losing_pnls:
            win_rate = len(winning) / total_trades
            avg_win = sum(winning_pnls) / len(winning_pnls)
            avg_loss = sum(losing_pnls) / len(losing_pnls)
            if avg_loss > 0:
                # Kelly = W - (1-W)/R where W=win rate, R=avg_win/avg_loss
                r = avg_win / avg_loss
                kelly = (win_rate - (1 - win_rate) / r) * 100 if r > 0 else None

        # Calculate K-Ratio (measures equity curve smoothness)
        k_ratio = None
        if len(pnls) >= 10:
            # Build cumulative P&L
            cumulative = []
            cum = 0
            for pnl in pnls:
                cum += pnl
                cumulative.append(cum)

            # Linear regression slope / std error of slope
            n = len(cumulative)
            x_mean = (n - 1) / 2
            y_mean = sum(cumulative) / n

            numerator = sum((i - x_mean) * (cumulative[i] - y_mean) for i in range(n))
            denominator = sum((i - x_mean) ** 2 for i in range(n))

            if denominator > 0:
                slope = numerator / denominator
                # Standard error of slope
                y_pred = [slope * i + (y_mean - slope * x_mean) for i in range(n)]
                sse = sum((cumulative[i] - y_pred[i]) ** 2 for i in range(n))
                se_slope = math.sqrt(sse / ((n - 2) * denominator)) if n > 2 else 1
                k_ratio = slope / se_slope if se_slope > 0 else None

        # Profit factor
        total_wins = sum(p.position.pnl for p in winning if p.position.pnl) if winning else 0
        total_losses = sum(abs(p.position.pnl) for p in losing if p.position.pnl) if losing else 0
        profit_factor = total_wins / total_losses if total_losses > 0 else 0

        # Commission calculation (from trades if available)
        total_commission = sum(
            sum(t.commission for t in p.trades) if hasattr(p, 'trades') and p.trades else 0
            for p in positions
        )

        return DetailedSummary(
            total_gain_loss=round(total_pnl, 2),
            largest_gain=round(max(pnls), 2) if pnls else 0,
            largest_loss=round(min(pnls), 2) if pnls else 0,
            avg_daily_pnl=round(total_pnl / trading_days, 2) if trading_days > 0 else 0,
            avg_daily_volume=round(total_volume / trading_days, 2) if trading_days > 0 else 0,
            trading_days=trading_days,
            avg_per_share_pnl=round(total_pnl / total_volume, 4) if total_volume > 0 else 0,
            avg_trade_pnl=round(total_pnl / total_trades, 2),
            avg_winning_trade=round(sum(p.position.pnl for p in winning if p.position.pnl) / len(winning), 2) if winning else 0,
            avg_losing_trade=round(sum(p.position.pnl for p in losing if p.position.pnl) / len(losing), 2) if losing else 0,
            total_trades=total_trades,
            winning_trades=len(winning),
            winning_pct=round(len(winning) / total_trades * 100, 1) if total_trades > 0 else 0,
            losing_trades=len(losing),
            losing_pct=round(len(losing) / total_trades * 100, 1) if total_trades > 0 else 0,
            scratch_trades=len(scratch),
            scratch_pct=round(len(scratch) / total_trades * 100, 1) if total_trades > 0 else 0,
            avg_hold_time_all=round(get_hold_time_minutes(positions), 1),
            avg_hold_time_scratch=round(get_hold_time_minutes(scratch), 1),
            avg_hold_time_winning=round(get_hold_time_minutes(winning), 1),
            avg_hold_time_losing=round(get_hold_time_minutes(losing), 1),
            max_consecutive_wins=max_win_streak,
            max_consecutive_losses=max_loss_streak,
            pnl_std_dev=round(std_dev, 2),
            sqn=round(sqn, 2) if sqn is not None else None,
            kelly_pct=round(kelly, 1) if kelly is not None else None,
            k_ratio=round(k_ratio, 2) if k_ratio is not None else None,
            profit_factor=round(profit_factor, 2),
            total_commissions=round(total_commission, 2),
            total_fees=0  # Would need fee data from trades
        )

    def _calculate_max_drawdown(self, pnls: list[float]) -> float:
        """Calculate maximum drawdown from P&L series."""
        if not pnls:
            return 0

        cumulative = 0
        peak = 0
        max_dd = 0

        for pnl in pnls:
            cumulative += pnl
            if cumulative > peak:
                peak = cumulative
            drawdown = peak - cumulative
            if drawdown > max_dd:
                max_dd = drawdown

        return round(max_dd, 2)

    def _calculate_by_symbol(self, positions) -> list[SymbolDetailedStats]:
        """Calculate statistics grouped by symbol."""
        symbol_data = defaultdict(list)

        for p in positions:
            symbol_data[p.position.symbol].append(p)

        results = []
        for symbol, pos_list in symbol_data.items():
            pnls = [p.position.pnl for p in pos_list if p.position.pnl is not None]
            wins = [pnl for pnl in pnls if pnl > 0]
            losses = [pnl for pnl in pnls if pnl < 0]

            total_pnl = sum(pnls)
            total_volume = sum(p.position.quantity for p in pos_list)

            # Calculate average holding time in minutes
            holding_times = []
            for p in pos_list:
                if p.position.exit_time and p.position.entry_time:
                    delta = p.position.exit_time - p.position.entry_time
                    holding_times.append(delta.total_seconds() / 60)

            avg_holding = sum(holding_times) / len(holding_times) if holding_times else None

            results.append(SymbolDetailedStats(
                symbol=symbol,
                trade_count=len(pnls),
                total_pnl=round(total_pnl, 2),
                total_commission=0,  # Would need to calculate from trades
                net_pnl=round(total_pnl, 2),
                win_count=len(wins),
                loss_count=len(losses),
                win_rate=round(len(wins) / len(pnls) * 100, 2) if pnls else 0,
                avg_pnl=round(total_pnl / len(pnls), 2) if pnls else 0,
                avg_win=round(sum(wins) / len(wins), 2) if wins else 0,
                avg_loss=round(sum(losses) / len(losses), 2) if losses else 0,
                profit_factor=round(abs(sum(wins) / sum(losses)), 2) if losses and sum(losses) != 0 else 0,
                best_trade=max(pnls) if pnls else 0,
                worst_trade=min(pnls) if pnls else 0,
                total_volume=total_volume,
                avg_holding_minutes=round(avg_holding, 1) if avg_holding else None
            ))

        # Sort by total P&L descending
        results.sort(key=lambda x: x.total_pnl, reverse=True)
        return results

    def _calculate_by_hour(self, positions) -> list[HourlyStats]:
        """Calculate statistics grouped by hour of entry."""
        hour_data = defaultdict(list)

        for p in positions:
            hour = p.position.entry_time.hour
            if p.position.pnl is not None:
                hour_data[hour].append(p.position.pnl)

        results = []
        for hour in range(24):
            pnls = hour_data.get(hour, [])
            wins = [pnl for pnl in pnls if pnl > 0]
            losses = [pnl for pnl in pnls if pnl < 0]

            results.append(HourlyStats(
                hour=hour,
                trade_count=len(pnls),
                total_pnl=round(sum(pnls), 2) if pnls else 0,
                win_count=len(wins),
                loss_count=len(losses),
                win_rate=round(len(wins) / len(pnls) * 100, 2) if pnls else 0,
                avg_pnl=round(sum(pnls) / len(pnls), 2) if pnls else 0
            ))

        return results

    def _calculate_by_day_of_week(self, positions) -> list[DayOfWeekStats]:
        """Calculate statistics grouped by day of week."""
        day_data = defaultdict(list)

        for p in positions:
            day = p.position.entry_time.weekday()
            if p.position.pnl is not None:
                day_data[day].append(p.position.pnl)

        results = []
        for day in range(7):
            pnls = day_data.get(day, [])
            wins = [pnl for pnl in pnls if pnl > 0]
            losses = [pnl for pnl in pnls if pnl < 0]

            results.append(DayOfWeekStats(
                day_of_week=day,
                day_name=self.DAY_NAMES[day],
                trade_count=len(pnls),
                total_pnl=round(sum(pnls), 2) if pnls else 0,
                win_count=len(wins),
                loss_count=len(losses),
                win_rate=round(len(wins) / len(pnls) * 100, 2) if pnls else 0,
                avg_pnl=round(sum(pnls) / len(pnls), 2) if pnls else 0
            ))

        return results

    def _calculate_by_holding_time(self, positions) -> list[HoldingTimeStats]:
        """Calculate statistics grouped by holding time."""
        range_data = {label: [] for _, _, label in self.HOLDING_TIME_RANGES}

        for p in positions:
            if p.position.exit_time and p.position.entry_time and p.position.pnl is not None:
                delta = p.position.exit_time - p.position.entry_time
                minutes = delta.total_seconds() / 60

                for min_val, max_val, label in self.HOLDING_TIME_RANGES:
                    if min_val <= minutes < max_val:
                        range_data[label].append(p.position.pnl)
                        break

        results = []
        for _, _, label in self.HOLDING_TIME_RANGES:
            pnls = range_data[label]
            wins = [pnl for pnl in pnls if pnl > 0]
            losses = [pnl for pnl in pnls if pnl < 0]

            results.append(HoldingTimeStats(
                range_label=label,
                trade_count=len(pnls),
                total_pnl=round(sum(pnls), 2) if pnls else 0,
                win_count=len(wins),
                loss_count=len(losses),
                win_rate=round(len(wins) / len(pnls) * 100, 2) if pnls else 0,
                avg_pnl=round(sum(pnls) / len(pnls), 2) if pnls else 0
            ))

        return results

    def _calculate_pnl_distribution(self, positions) -> list[PnlRangeStats]:
        """Calculate P&L distribution."""
        total_count = len([p for p in positions if p.position.pnl is not None])
        if total_count == 0:
            return []

        range_counts = {label: 0 for _, _, label in self.PNL_RANGES}

        for p in positions:
            if p.position.pnl is not None:
                pnl = p.position.pnl
                for min_val, max_val, label in self.PNL_RANGES:
                    if min_val <= pnl < max_val:
                        range_counts[label] += 1
                        break

        results = []
        for _, _, label in self.PNL_RANGES:
            count = range_counts[label]
            results.append(PnlRangeStats(
                range_label=label,
                trade_count=count,
                percentage=round(count / total_count * 100, 2) if total_count > 0 else 0
            ))

        return results

    def _calculate_daily_pnl(self, positions) -> list[DailyPnlData]:
        """Calculate daily P&L data for charts."""
        daily_data = defaultdict(lambda: {"pnl": 0, "trades": 0, "wins": 0, "losses": 0, "volume": 0})

        for p in positions:
            if p.position.exit_time and p.position.pnl is not None:
                date = p.position.exit_time.strftime("%Y-%m-%d")
                daily_data[date]["pnl"] += p.position.pnl
                daily_data[date]["trades"] += 1
                daily_data[date]["volume"] += p.position.quantity
                if p.position.pnl > 0:
                    daily_data[date]["wins"] += 1
                elif p.position.pnl < 0:
                    daily_data[date]["losses"] += 1

        # Sort by date and calculate cumulative
        sorted_dates = sorted(daily_data.keys())
        results = []
        cumulative = 0

        for date in sorted_dates:
            data = daily_data[date]
            cumulative += data["pnl"]
            total_trades = data["trades"]
            win_rate = round(data["wins"] / total_trades * 100, 2) if total_trades > 0 else 0

            results.append(DailyPnlData(
                date=date,
                pnl=round(data["pnl"], 2),
                cumulative_pnl=round(cumulative, 2),
                trade_count=total_trades,
                win_count=data["wins"],
                loss_count=data["losses"],
                win_rate=win_rate,
                volume=data["volume"]
            ))

        return results

    def _calculate_streak_data(self, positions) -> StreakData:
        """Calculate win/loss streak data."""
        if not positions:
            return StreakData(
                current_streak=0, max_win_streak=0, max_loss_streak=0, current_streak_pnl=0
            )

        # Sort by exit time
        sorted_positions = sorted(
            [p for p in positions if p.position.exit_time and p.position.pnl is not None],
            key=lambda p: p.position.exit_time
        )

        if not sorted_positions:
            return StreakData(
                current_streak=0, max_win_streak=0, max_loss_streak=0, current_streak_pnl=0
            )

        max_win_streak = 0
        max_loss_streak = 0
        current_streak = 0
        current_streak_pnl = 0
        temp_streak = 0

        for p in sorted_positions:
            pnl = p.position.pnl
            if pnl > 0:
                if temp_streak > 0:
                    temp_streak += 1
                else:
                    temp_streak = 1
                max_win_streak = max(max_win_streak, temp_streak)
            elif pnl < 0:
                if temp_streak < 0:
                    temp_streak -= 1
                else:
                    temp_streak = -1
                max_loss_streak = max(max_loss_streak, abs(temp_streak))

        # Calculate current streak from the end
        current_streak = 0
        current_streak_pnl = 0
        for p in reversed(sorted_positions):
            pnl = p.position.pnl
            if current_streak == 0:
                current_streak = 1 if pnl > 0 else -1
                current_streak_pnl = pnl
            elif (current_streak > 0 and pnl > 0) or (current_streak < 0 and pnl < 0):
                current_streak += 1 if current_streak > 0 else -1
                current_streak_pnl += pnl
            else:
                break

        return StreakData(
            current_streak=current_streak,
            max_win_streak=max_win_streak,
            max_loss_streak=max_loss_streak,
            current_streak_pnl=round(current_streak_pnl, 2)
        )

    def _generate_insights(self, summary, by_symbol, by_hour, by_day_of_week, by_holding_time, streak_data) -> list[str]:
        """Generate actionable trading insights."""
        insights = []

        # Win rate insight
        if summary.win_rate < 40:
            insights.append(f"⚠️ Win rate is low ({summary.win_rate:.1f}%). Consider reducing position size and being more selective with entries.")
        elif summary.win_rate > 60:
            insights.append(f"✅ Strong win rate ({summary.win_rate:.1f}%). Focus on increasing position size on high-conviction setups.")

        # Profit factor insight
        if summary.profit_factor < 1:
            insights.append(f"⚠️ Profit factor is {summary.profit_factor:.2f} (below 1). Your losses outweigh gains. Consider tighter stop losses.")
        elif summary.profit_factor > 2:
            insights.append(f"✅ Excellent profit factor ({summary.profit_factor:.2f}). Your risk/reward management is solid.")

        # Best performing hour
        profitable_hours = [h for h in by_hour if h.total_pnl > 0 and h.trade_count >= 3]
        if profitable_hours:
            best_hour = max(profitable_hours, key=lambda h: h.total_pnl)
            insights.append(f"💡 Best trading hour: {best_hour.hour}:00 with {best_hour.win_rate:.0f}% win rate and ${best_hour.total_pnl:.2f} profit.")

        # Worst performing hour
        losing_hours = [h for h in by_hour if h.total_pnl < 0 and h.trade_count >= 3]
        if losing_hours:
            worst_hour = min(losing_hours, key=lambda h: h.total_pnl)
            insights.append(f"⛔ Avoid trading at {worst_hour.hour}:00 - you've lost ${abs(worst_hour.total_pnl):.2f} with {worst_hour.win_rate:.0f}% win rate.")

        # Best day of week
        profitable_days = [d for d in by_day_of_week if d.total_pnl > 0 and d.trade_count >= 3]
        if profitable_days:
            best_day = max(profitable_days, key=lambda d: d.total_pnl)
            insights.append(f"📅 {best_day.day_name} is your best day with ${best_day.total_pnl:.2f} profit.")

        # Worst day of week
        losing_days = [d for d in by_day_of_week if d.total_pnl < 0 and d.trade_count >= 3]
        if losing_days:
            worst_day = min(losing_days, key=lambda d: d.total_pnl)
            insights.append(f"📅 Consider reducing activity on {worst_day.day_name} - you've lost ${abs(worst_day.total_pnl):.2f}.")

        # Best symbol
        if by_symbol:
            profitable_symbols = [s for s in by_symbol if s.total_pnl > 0]
            if profitable_symbols:
                best_symbol = max(profitable_symbols, key=lambda s: s.total_pnl)
                insights.append(f"🎯 Your best performing symbol: {best_symbol.symbol} (+${best_symbol.total_pnl:.2f}, {best_symbol.win_rate:.0f}% win rate).")

            losing_symbols = [s for s in by_symbol if s.total_pnl < 0]
            if losing_symbols:
                worst_symbol = min(losing_symbols, key=lambda s: s.total_pnl)
                insights.append(f"❌ Avoid {worst_symbol.symbol} - you've lost ${abs(worst_symbol.total_pnl):.2f} with only {worst_symbol.win_rate:.0f}% win rate.")

        # Holding time insight
        profitable_holding = [h for h in by_holding_time if h.total_pnl > 0 and h.trade_count >= 3]
        if profitable_holding:
            best_holding = max(profitable_holding, key=lambda h: h.avg_pnl)
            insights.append(f"⏱️ Optimal holding time: {best_holding.range_label} with ${best_holding.avg_pnl:.2f} average profit per trade.")

        # Streak warning
        if streak_data.current_streak < -3:
            insights.append(f"🚨 You're on a {abs(streak_data.current_streak)}-trade losing streak (${abs(streak_data.current_streak_pnl):.2f}). Consider taking a break.")
        elif streak_data.current_streak > 3:
            insights.append(f"🔥 You're on a {streak_data.current_streak}-trade winning streak (+${streak_data.current_streak_pnl:.2f}). Stay disciplined!")

        # Average win vs loss
        if summary.avg_win > 0 and summary.avg_loss < 0:
            ratio = abs(summary.avg_win / summary.avg_loss)
            if ratio < 1:
                insights.append(f"⚠️ Your avg win (${summary.avg_win:.2f}) is smaller than avg loss (${abs(summary.avg_loss):.2f}). Let winners run longer.")
            elif ratio > 2:
                insights.append(f"✅ Great risk/reward: avg win ${summary.avg_win:.2f} vs avg loss ${abs(summary.avg_loss):.2f}.")

        return insights

    def _calculate_by_market_condition(
        self,
        positions,
        field_name: str,
        ranges: list[tuple]
    ) -> list[MarketConditionStats]:
        """Calculate statistics grouped by a market condition field."""
        total_count = len([p for p in positions if p.position.pnl is not None])
        if total_count == 0:
            return [MarketConditionStats(
                range_label=label, trade_count=0, total_pnl=0,
                win_count=0, loss_count=0, win_rate=0, avg_pnl=0, percentage=0
            ) for _, _, label in ranges]

        range_data = {label: [] for _, _, label in ranges}

        for p in positions:
            if p.position.pnl is None:
                continue

            value = getattr(p.position, field_name, None)
            if value is None:
                continue

            for min_val, max_val, label in ranges:
                if min_val <= value < max_val:
                    range_data[label].append(p.position.pnl)
                    break

        results = []
        for _, _, label in ranges:
            pnls = range_data[label]
            wins = [pnl for pnl in pnls if pnl > 0]
            losses = [pnl for pnl in pnls if pnl < 0]

            results.append(MarketConditionStats(
                range_label=label,
                trade_count=len(pnls),
                total_pnl=round(sum(pnls), 2) if pnls else 0,
                win_count=len(wins),
                loss_count=len(losses),
                win_rate=round(len(wins) / len(pnls) * 100, 2) if pnls else 0,
                avg_pnl=round(sum(pnls) / len(pnls), 2) if pnls else 0,
                percentage=round(len(pnls) / total_count * 100, 2) if total_count > 0 else 0
            ))

        return results

    def _calculate_by_day_type(self, positions) -> list[MarketConditionStats]:
        """Calculate statistics grouped by day type."""
        total_count = len([p for p in positions if p.position.pnl is not None])
        if total_count == 0:
            return [MarketConditionStats(
                range_label=day_type, trade_count=0, total_pnl=0,
                win_count=0, loss_count=0, win_rate=0, avg_pnl=0, percentage=0
            ) for day_type in self.DAY_TYPES]

        type_data = {day_type: [] for day_type in self.DAY_TYPES}

        for p in positions:
            if p.position.pnl is None:
                continue

            day_type = getattr(p.position, 'day_type', None) or 'unknown'
            if day_type in type_data:
                type_data[day_type].append(p.position.pnl)

        results = []
        for day_type in self.DAY_TYPES:
            pnls = type_data[day_type]
            wins = [pnl for pnl in pnls if pnl > 0]
            losses = [pnl for pnl in pnls if pnl < 0]

            results.append(MarketConditionStats(
                range_label=day_type.replace('_', ' ').title(),
                trade_count=len(pnls),
                total_pnl=round(sum(pnls), 2) if pnls else 0,
                win_count=len(wins),
                loss_count=len(losses),
                win_rate=round(len(wins) / len(pnls) * 100, 2) if pnls else 0,
                avg_pnl=round(sum(pnls) / len(pnls), 2) if pnls else 0,
                percentage=round(len(pnls) / total_count * 100, 2) if total_count > 0 else 0
            ))

        return results

    def _calculate_rr_analysis(
        self,
        positions,
        field_name: str,
        ranges: list[tuple],
        base_risk: float = 5.0
    ) -> list[RiskRewardAnalysis]:
        """Calculate Risk/Reward analysis grouped by a field value.

        Args:
            positions: List of positions with trades
            field_name: Field name to group by (e.g., 'entry_price')
            ranges: List of (min, max, label) tuples for grouping
            base_risk: Base risk in dollars (default $5)

        Returns:
            List of RiskRewardAnalysis objects with win rate and R:R metrics
        """
        if not positions:
            return [RiskRewardAnalysis(
                range_label=label, trade_count=0, win_count=0, loss_count=0,
                win_rate=0, total_pnl=0, avg_win=0, avg_loss=0,
                risk_reward_ratio=0, expectancy=0, total_r=0
            ) for _, _, label in ranges]

        range_data = {label: [] for _, _, label in ranges}

        for p in positions:
            if p.position.pnl is None:
                continue

            value = getattr(p.position, field_name, None)
            if value is None:
                continue

            for min_val, max_val, label in ranges:
                if min_val <= value < max_val:
                    range_data[label].append(p.position.pnl)
                    break

        results = []
        for _, _, label in ranges:
            pnls = range_data[label]
            wins = [pnl for pnl in pnls if pnl > 0]
            losses = [pnl for pnl in pnls if pnl < 0]

            trade_count = len(pnls)
            win_count = len(wins)
            loss_count = len(losses)
            total_pnl = sum(pnls) if pnls else 0
            avg_win = sum(wins) / len(wins) if wins else 0
            avg_loss = abs(sum(losses) / len(losses)) if losses else 0
            win_rate = (win_count / trade_count * 100) if trade_count > 0 else 0

            # R:R ratio = avg_win / base_risk
            rr_ratio = avg_win / base_risk if base_risk > 0 else 0

            # Expectancy = (win_rate * avg_win) - ((1-win_rate) * avg_loss)
            win_rate_decimal = win_rate / 100
            expectancy = (win_rate_decimal * avg_win) - ((1 - win_rate_decimal) * avg_loss)

            # Total R = total P&L / base_risk
            total_r = total_pnl / base_risk if base_risk > 0 else 0

            results.append(RiskRewardAnalysis(
                range_label=label,
                trade_count=trade_count,
                win_count=win_count,
                loss_count=loss_count,
                win_rate=round(win_rate, 2),
                total_pnl=round(total_pnl, 2),
                avg_win=round(avg_win, 2),
                avg_loss=round(avg_loss, 2),
                risk_reward_ratio=round(rr_ratio, 2),
                expectancy=round(expectancy, 2),
                total_r=round(total_r, 2)
            ))

        return results
