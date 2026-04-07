from datetime import datetime
from typing import Optional
from collections import defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.trade import Trade
from ..models.position import Position
from ..schemas import AnalysisSummary, SymbolAnalysis, DateAnalysis


class PositionWithTrades:
    """Position data with associated trade IDs for tracking."""
    def __init__(self, position: Position, entry_trade_ids: list[int], exit_trade_ids: list[int]):
        self.position = position
        self.entry_trade_ids = entry_trade_ids
        self.exit_trade_ids = exit_trade_ids
        self.all_trade_ids = entry_trade_ids + exit_trade_ids


class AnalysisService:
    async def calculate_positions_with_trades(
        self,
        db: AsyncSession,
        symbol: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> list[PositionWithTrades]:
        """Calculate positions using FIFO matching, tracking which trades belong to each position."""
        query = select(Trade).order_by(Trade.executed_at.asc())
        if user_id is not None:
            query = query.where(Trade.user_id == user_id)
        if symbol:
            query = query.where(Trade.symbol == symbol.upper())

        result = await db.execute(query)
        trades = result.scalars().all()

        # Track open lots with trade IDs
        open_lots: dict[str, list[dict]] = defaultdict(list)
        positions_with_trades: list[PositionWithTrades] = []
        position_id_counter = 1

        for trade in trades:
            sym = trade.symbol

            if trade.side == "BUY":
                open_lots[sym].append({
                    "trade_id": trade.id,
                    "quantity": trade.quantity,
                    "price": trade.price,
                    "time": trade.executed_at,
                    "commission": trade.commission,
                    "remaining_qty": trade.quantity
                })
            else:
                remaining = trade.quantity
                sell_price = trade.price
                sell_time = trade.executed_at
                sell_commission = trade.commission

                while remaining > 0 and open_lots[sym]:
                    lot = open_lots[sym][0]
                    matched_qty = min(remaining, lot["remaining_qty"])

                    entry_price = lot["price"]
                    entry_time = lot["time"]
                    pnl = (sell_price - entry_price) * matched_qty

                    # Calculate commission proportionally
                    entry_commission = lot["commission"] * (matched_qty / lot["quantity"])
                    exit_commission = sell_commission * (matched_qty / trade.quantity)
                    total_commission = entry_commission + exit_commission
                    pnl -= total_commission

                    pnl_percent = ((sell_price - entry_price) / entry_price) * 100
                    holding_days = (sell_time - entry_time).days

                    position = Position(
                        id=position_id_counter,
                        symbol=sym,
                        entry_price=entry_price,
                        exit_price=sell_price,
                        quantity=matched_qty,
                        pnl=round(pnl, 2),
                        pnl_percent=round(pnl_percent, 2),
                        entry_time=entry_time,
                        exit_time=sell_time,
                        holding_days=holding_days,
                        status="closed"
                    )

                    pos_with_trades = PositionWithTrades(
                        position=position,
                        entry_trade_ids=[lot["trade_id"]],
                        exit_trade_ids=[trade.id]
                    )
                    positions_with_trades.append(pos_with_trades)
                    position_id_counter += 1

                    lot["remaining_qty"] -= matched_qty
                    remaining -= matched_qty

                    if lot["remaining_qty"] <= 0:
                        open_lots[sym].pop(0)

        # Add open positions
        for sym, lots in open_lots.items():
            for lot in lots:
                if lot["remaining_qty"] > 0:
                    position = Position(
                        id=position_id_counter,
                        symbol=sym,
                        entry_price=lot["price"],
                        exit_price=None,
                        quantity=lot["remaining_qty"],
                        pnl=None,
                        pnl_percent=None,
                        entry_time=lot["time"],
                        exit_time=None,
                        holding_days=None,
                        status="open"
                    )

                    pos_with_trades = PositionWithTrades(
                        position=position,
                        entry_trade_ids=[lot["trade_id"]],
                        exit_trade_ids=[]
                    )
                    positions_with_trades.append(pos_with_trades)
                    position_id_counter += 1

        return positions_with_trades

    async def calculate_positions(self, db: AsyncSession, symbol: Optional[str] = None, user_id: Optional[int] = None) -> list[Position]:
        """Calculate positions using FIFO matching of buys and sells."""
        positions_with_trades = await self.calculate_positions_with_trades(db, symbol, user_id=user_id)
        return [pwt.position for pwt in positions_with_trades]

    async def get_position_detail(
        self,
        db: AsyncSession,
        position_id: int,
        user_id: Optional[int] = None,
    ) -> Optional[dict]:
        """Get position details including all associated trades."""
        positions_with_trades = await self.calculate_positions_with_trades(db, user_id=user_id)

        # Find the position by ID
        target_pos = None
        for pwt in positions_with_trades:
            if pwt.position.id == position_id:
                target_pos = pwt
                break

        if not target_pos:
            return None

        # Fetch all associated trades
        trade_ids = target_pos.all_trade_ids
        query = select(Trade).where(Trade.id.in_(trade_ids)).order_by(Trade.executed_at.asc())
        result = await db.execute(query)
        trades = result.scalars().all()

        # Calculate total commission
        total_commission = sum(t.commission for t in trades)

        return {
            "position": target_pos.position,
            "trades": trades,
            "total_commission": total_commission,
            "entry_trade_ids": target_pos.entry_trade_ids,
            "exit_trade_ids": target_pos.exit_trade_ids
        }

    async def get_summary(
        self,
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[int] = None,
    ) -> AnalysisSummary:
        positions = await self.calculate_positions(db, user_id=user_id)

        closed_positions = [p for p in positions if p.status == "closed"]
        if start_date:
            closed_positions = [p for p in closed_positions if p.exit_time >= start_date]
        if end_date:
            closed_positions = [p for p in closed_positions if p.exit_time <= end_date]

        if not closed_positions:
            return AnalysisSummary(
                total_trades=0,
                total_pnl=0.0,
                total_commission=0.0,
                net_pnl=0.0,
                win_count=0,
                loss_count=0,
                win_rate=0.0,
                avg_win=0.0,
                avg_loss=0.0,
                profit_factor=0.0,
                max_drawdown=0.0,
                best_trade=0.0,
                worst_trade=0.0
            )

        pnls = [p.pnl for p in closed_positions]
        total_pnl = sum(pnls)

        wins = [p for p in pnls if p > 0]
        losses = [p for p in pnls if p <= 0]

        win_count = len(wins)
        loss_count = len(losses)
        win_rate = (win_count / len(pnls)) * 100 if pnls else 0

        avg_win = sum(wins) / len(wins) if wins else 0
        avg_loss = abs(sum(losses) / len(losses)) if losses else 0

        gross_profit = sum(wins) if wins else 0
        gross_loss = abs(sum(losses)) if losses else 0
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')

        cumulative = 0
        peak = 0
        max_drawdown = 0
        for pnl in pnls:
            cumulative += pnl
            if cumulative > peak:
                peak = cumulative
            drawdown = peak - cumulative
            if drawdown > max_drawdown:
                max_drawdown = drawdown

        return AnalysisSummary(
            total_trades=len(closed_positions),
            total_pnl=round(total_pnl, 2),
            total_commission=0.0,
            net_pnl=round(total_pnl, 2),
            win_count=win_count,
            loss_count=loss_count,
            win_rate=round(win_rate, 2),
            avg_win=round(avg_win, 2),
            avg_loss=round(avg_loss, 2),
            profit_factor=round(profit_factor, 2) if profit_factor != float('inf') else 999.99,
            max_drawdown=round(max_drawdown, 2),
            best_trade=round(max(pnls), 2) if pnls else 0.0,
            worst_trade=round(min(pnls), 2) if pnls else 0.0
        )

    async def get_by_symbol(
        self,
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[int] = None,
    ) -> list[SymbolAnalysis]:
        positions = await self.calculate_positions(db, user_id=user_id)
        closed_positions = [p for p in positions if p.status == "closed"]

        if start_date:
            closed_positions = [p for p in closed_positions if p.exit_time >= start_date]
        if end_date:
            closed_positions = [p for p in closed_positions if p.exit_time <= end_date]

        symbol_stats: dict[str, dict] = defaultdict(lambda: {
            "total_trades": 0,
            "total_pnl": 0.0,
            "wins": 0,
            "pnls": []
        })

        for pos in closed_positions:
            stats = symbol_stats[pos.symbol]
            stats["total_trades"] += 1
            stats["total_pnl"] += pos.pnl
            stats["pnls"].append(pos.pnl)
            if pos.pnl > 0:
                stats["wins"] += 1

        results = []
        for symbol, stats in symbol_stats.items():
            win_rate = (stats["wins"] / stats["total_trades"]) * 100 if stats["total_trades"] else 0
            avg_pnl = stats["total_pnl"] / stats["total_trades"] if stats["total_trades"] else 0

            results.append(SymbolAnalysis(
                symbol=symbol,
                total_trades=stats["total_trades"],
                total_pnl=round(stats["total_pnl"], 2),
                win_rate=round(win_rate, 2),
                avg_pnl=round(avg_pnl, 2)
            ))

        return sorted(results, key=lambda x: x.total_pnl, reverse=True)

    async def get_by_date(
        self,
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[int] = None,
    ) -> list[DateAnalysis]:
        positions = await self.calculate_positions(db, user_id=user_id)
        closed_positions = [p for p in positions if p.status == "closed"]

        if start_date:
            closed_positions = [p for p in closed_positions if p.exit_time >= start_date]
        if end_date:
            closed_positions = [p for p in closed_positions if p.exit_time <= end_date]

        date_stats: dict[str, dict] = defaultdict(lambda: {
            "total_pnl": 0.0,
            "trade_count": 0,
            "wins": 0,
            "losses": 0
        })

        for pos in closed_positions:
            date_key = pos.exit_time.strftime("%Y-%m-%d")
            stats = date_stats[date_key]
            stats["total_pnl"] += pos.pnl
            stats["trade_count"] += 1
            if pos.pnl > 0:
                stats["wins"] += 1
            else:
                stats["losses"] += 1

        results = []
        for date_str, stats in sorted(date_stats.items()):
            results.append(DateAnalysis(
                date=date_str,
                total_pnl=round(stats["total_pnl"], 2),
                trade_count=stats["trade_count"],
                win_count=stats["wins"],
                loss_count=stats["losses"]
            ))

        return results
