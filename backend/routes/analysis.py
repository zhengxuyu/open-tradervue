from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from datetime import datetime
from typing import Optional

from ..database import get_db
from ..models.trade import Trade
from ..schemas import (
    AnalysisSummary, SymbolAnalysis, DateAnalysis,
    PositionResponse, PositionDetailResponse, TradeResponse
)
from ..services.analysis import AnalysisService

router = APIRouter(prefix="/api", tags=["analysis"])


@router.get("/positions", response_model=list[PositionResponse])
async def get_positions(
    symbol: Optional[str] = None,
    status: Optional[str] = Query(None, pattern="^(open|closed)$"),
    db: AsyncSession = Depends(get_db)
):
    service = AnalysisService()
    positions = await service.calculate_positions(db, symbol)

    if status:
        positions = [p for p in positions if p.status == status]

    # Sort by exit_time (or entry_time for open positions) descending
    positions.sort(
        key=lambda p: p.exit_time or p.entry_time,
        reverse=True
    )

    return positions


@router.get("/positions/{position_id}", response_model=PositionDetailResponse)
async def get_position_detail(
    position_id: int,
    db: AsyncSession = Depends(get_db)
):
    service = AnalysisService()
    detail = await service.get_position_detail(db, position_id)

    if not detail:
        raise HTTPException(status_code=404, detail="Position not found")

    position = detail["position"]
    trades = detail["trades"]

    return PositionDetailResponse(
        id=position.id,
        symbol=position.symbol,
        entry_price=position.entry_price,
        exit_price=position.exit_price,
        quantity=position.quantity,
        pnl=position.pnl,
        pnl_percent=position.pnl_percent,
        entry_time=position.entry_time,
        exit_time=position.exit_time,
        holding_days=position.holding_days,
        status=position.status,
        total_commission=detail["total_commission"],
        trades=[TradeResponse(
            id=t.id,
            symbol=t.symbol,
            side=t.side,
            quantity=t.quantity,
            price=t.price,
            executed_at=t.executed_at,
            commission=t.commission,
            notes=t.notes,
            tags=t.tags or [],
            created_at=t.created_at,
            updated_at=t.updated_at
        ) for t in trades],
        entry_trade_ids=detail["entry_trade_ids"],
        exit_trade_ids=detail["exit_trade_ids"]
    )


@router.delete("/positions/{position_id}")
async def delete_position(
    position_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a position and all its associated trades."""
    service = AnalysisService()
    detail = await service.get_position_detail(db, position_id)

    if not detail:
        raise HTTPException(status_code=404, detail="Position not found")

    # Delete all trades associated with this position
    trade_ids = detail["entry_trade_ids"] + detail["exit_trade_ids"]
    if trade_ids:
        await db.execute(delete(Trade).where(Trade.id.in_(trade_ids)))
        await db.commit()

    return {"message": f"Deleted position {position_id} and {len(trade_ids)} associated trades"}


@router.delete("/positions")
async def delete_positions(
    position_ids: list[int] = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete multiple positions and all their associated trades."""
    service = AnalysisService()

    # First, collect ALL trade IDs from all positions before deleting any
    # This is important because position IDs are calculated dynamically
    # and will change after trades are deleted
    all_trade_ids = set()

    for position_id in position_ids:
        detail = await service.get_position_detail(db, position_id)
        if detail:
            trade_ids = detail["entry_trade_ids"] + detail["exit_trade_ids"]
            all_trade_ids.update(trade_ids)

    # Now delete all trades at once
    if all_trade_ids:
        await db.execute(delete(Trade).where(Trade.id.in_(list(all_trade_ids))))
        await db.commit()

    return {"message": f"Deleted {len(position_ids)} positions and {len(all_trade_ids)} associated trades"}


@router.get("/analysis/summary", response_model=AnalysisSummary)
async def get_analysis_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    service = AnalysisService()
    return await service.get_summary(db, start_date, end_date)


@router.get("/analysis/by-symbol", response_model=list[SymbolAnalysis])
async def get_analysis_by_symbol(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    service = AnalysisService()
    return await service.get_by_symbol(db, start_date, end_date)


@router.get("/analysis/by-date", response_model=list[DateAnalysis])
async def get_analysis_by_date(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    service = AnalysisService()
    return await service.get_by_date(db, start_date, end_date)
