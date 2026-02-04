from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional

from ..database import get_db
from ..models.trade import Trade
from ..schemas import (
    TradeCreate, TradeUpdate, TradeResponse,
    CSVFieldMapping, CSVPreview, ImportResult,
    CSVTextPreviewRequest, CSVTextImportRequest
)
from ..services.csv_import import CSVImportService

router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.get("", response_model=list[TradeResponse])
async def get_trades(
    symbol: Optional[str] = None,
    side: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    tags: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    query = select(Trade).order_by(Trade.executed_at.desc())

    if symbol:
        query = query.where(Trade.symbol == symbol.upper())
    if side:
        query = query.where(Trade.side == side.upper())
    if start_date:
        query = query.where(Trade.executed_at >= start_date)
    if end_date:
        query = query.where(Trade.executed_at <= end_date)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{trade_id}", response_model=TradeResponse)
async def get_trade(trade_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Trade).where(Trade.id == trade_id))
    trade = result.scalar_one_or_none()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.post("", response_model=TradeResponse, status_code=201)
async def create_trade(trade: TradeCreate, db: AsyncSession = Depends(get_db)):
    db_trade = Trade(
        symbol=trade.symbol.upper(),
        side=trade.side.upper(),
        quantity=trade.quantity,
        price=trade.price,
        executed_at=trade.executed_at,
        commission=trade.commission,
        notes=trade.notes,
        tags=trade.tags
    )
    db.add(db_trade)
    await db.commit()
    await db.refresh(db_trade)
    return db_trade


@router.put("/{trade_id}", response_model=TradeResponse)
async def update_trade(trade_id: int, trade: TradeUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Trade).where(Trade.id == trade_id))
    db_trade = result.scalar_one_or_none()
    if not db_trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    update_data = trade.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "symbol" and value:
            value = value.upper()
        if key == "side" and value:
            value = value.upper()
        setattr(db_trade, key, value)

    await db.commit()
    await db.refresh(db_trade)
    return db_trade


@router.delete("/{trade_id}", status_code=204)
async def delete_trade(trade_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Trade).where(Trade.id == trade_id))
    db_trade = result.scalar_one_or_none()
    if not db_trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    await db.delete(db_trade)
    await db.commit()


@router.post("/import/preview", response_model=CSVPreview)
async def preview_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    service = CSVImportService()
    return service.preview_csv(content.decode('utf-8'))


@router.post("/import/preview-text", response_model=CSVPreview)
async def preview_csv_text(request: CSVTextPreviewRequest):
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    service = CSVImportService()
    return service.preview_csv(request.content)


@router.post("/import", response_model=ImportResult)
async def import_csv(
    file: UploadFile = File(...),
    mapping: Optional[str] = Form(None),
    timezone: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    service = CSVImportService()

    field_mapping = None
    if mapping:
        import json
        field_mapping = CSVFieldMapping(**json.loads(mapping))

    return await service.import_csv(content.decode('utf-8'), db, field_mapping, timezone)


@router.post("/import-text", response_model=ImportResult)
async def import_csv_text(
    request: CSVTextImportRequest,
    db: AsyncSession = Depends(get_db)
):
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    service = CSVImportService()
    return await service.import_csv(
        request.content,
        db,
        request.mapping,
        request.timezone
    )
