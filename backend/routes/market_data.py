from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone
from typing import Optional

_ET = timezone(timedelta(hours=-4))  # US Eastern (EDT)

from ..database import get_db
from ..auth import get_current_user, CurrentUser
from ..schemas import KlineData
from ..services.yahoo_finance import YahooFinanceService

router = APIRouter(prefix="/api/market", tags=["market"])

yahoo_finance_service = YahooFinanceService()


@router.get("/kline", response_model=list[KlineData])
async def get_kline(
    symbol: str = Query(..., min_length=1, max_length=10),
    interval: str = Query("daily", pattern="^(1min|5min|15min|30min|60min|daily|1d|1h)$"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        klines = await yahoo_finance_service.get_kline(
            symbol=symbol.upper(),
            interval=interval,
            start_date=start_date,
            end_date=end_date
        )
        return klines
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trades-with-kline")
async def get_trades_with_kline(
    symbol: str = Query(..., min_length=1, max_length=10),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from sqlalchemy import select
    from ..models.trade import Trade

    query = select(Trade).where(Trade.symbol == symbol.upper(), Trade.user_id == current_user.id)
    if start_date:
        query = query.where(Trade.executed_at >= start_date)
    if end_date:
        query = query.where(Trade.executed_at <= end_date)
    query = query.order_by(Trade.executed_at.asc())

    result = await db.execute(query)
    trades = result.scalars().all()

    if not trades:
        raise HTTPException(status_code=404, detail="No trades found for this symbol")

    first_trade = trades[0]
    last_trade = trades[-1]

    kline_start = start_date or first_trade.executed_at
    kline_end = end_date or last_trade.executed_at

    try:
        klines = await yahoo_finance_service.get_kline(
            symbol=symbol.upper(),
            interval="daily",
            start_date=kline_start,
            end_date=kline_end
        )
    except Exception as e:
        klines = []

    trade_markers = [
        {
            "id": t.id,
            "time": t.executed_at.replace(tzinfo=timezone.utc).astimezone(_ET).replace(tzinfo=None).isoformat(),
            "side": t.side,
            "price": t.price,
            "quantity": t.quantity
        }
        for t in trades
    ]

    return {
        "symbol": symbol.upper(),
        "klines": [k.model_dump() for k in klines],
        "trades": trade_markers
    }
