from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from ..database import get_db
from ..auth import get_current_user, CurrentUser
from ..models.journal import Journal
from ..schemas import (
    JournalCreate, JournalUpdate, JournalResponse, JournalWithTrades, PositionResponse
)
from ..services.analysis import AnalysisService

router = APIRouter(prefix="/api/journals", tags=["journals"])


@router.get("", response_model=list[JournalResponse])
async def get_journals(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get all journal entries, ordered by date descending."""
    result = await db.execute(
        select(Journal).where(Journal.user_id == current_user.id).order_by(Journal.date.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/{date}", response_model=JournalWithTrades)
async def get_journal(
    date: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get journal entry for a specific date with associated trades."""
    result = await db.execute(select(Journal).where(Journal.date == date, Journal.user_id == current_user.id))
    journal = result.scalar_one_or_none()

    # Get positions for this date
    service = AnalysisService()
    all_positions = await service.calculate_positions(db, user_id=current_user.id)
    day_positions = [
        p for p in all_positions
        if p.status == 'closed' and p.exit_time and p.exit_time.strftime('%Y-%m-%d') == date
    ]

    # Calculate daily summary
    pnl_summary = sum(p.pnl or 0 for p in day_positions)
    trade_count = len(day_positions)

    if journal:
        # Update the journal with current trade data
        journal.pnl_summary = pnl_summary
        journal.trade_count = trade_count
        await db.commit()
        await db.refresh(journal)

        return JournalWithTrades(
            id=journal.id,
            date=journal.date,
            content=journal.content,
            mood=journal.mood,
            lessons=journal.lessons,
            mistakes=journal.mistakes,
            improvements=journal.improvements,
            pnl_summary=pnl_summary,
            trade_count=trade_count,
            created_at=journal.created_at,
            updated_at=journal.updated_at,
            positions=[PositionResponse(
                id=p.id,
                symbol=p.symbol,
                entry_price=p.entry_price,
                exit_price=p.exit_price,
                quantity=p.quantity,
                pnl=p.pnl,
                pnl_percent=p.pnl_percent,
                entry_time=p.entry_time,
                exit_time=p.exit_time,
                holding_days=p.holding_days,
                status=p.status
            ) for p in day_positions]
        )
    else:
        # Return a virtual journal with just the trade data
        from datetime import datetime
        return JournalWithTrades(
            id=0,
            date=date,
            content=None,
            mood=None,
            lessons=None,
            mistakes=None,
            improvements=None,
            pnl_summary=pnl_summary,
            trade_count=trade_count,
            created_at=datetime.now(),
            updated_at=None,
            positions=[PositionResponse(
                id=p.id,
                symbol=p.symbol,
                entry_price=p.entry_price,
                exit_price=p.exit_price,
                quantity=p.quantity,
                pnl=p.pnl,
                pnl_percent=p.pnl_percent,
                entry_time=p.entry_time,
                exit_time=p.exit_time,
                holding_days=p.holding_days,
                status=p.status
            ) for p in day_positions]
        )


@router.post("", response_model=JournalResponse)
async def create_journal(
    journal: JournalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new journal entry."""
    # Check if journal for this date already exists
    result = await db.execute(select(Journal).where(Journal.date == journal.date, Journal.user_id == current_user.id))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Journal entry for this date already exists")

    # Calculate daily stats
    service = AnalysisService()
    all_positions = await service.calculate_positions(db, user_id=current_user.id)
    day_positions = [
        p for p in all_positions
        if p.status == 'closed' and p.exit_time and p.exit_time.strftime('%Y-%m-%d') == journal.date
    ]
    pnl_summary = sum(p.pnl or 0 for p in day_positions)
    trade_count = len(day_positions)

    db_journal = Journal(
        user_id=current_user.id,
        date=journal.date,
        content=journal.content,
        mood=journal.mood,
        lessons=journal.lessons,
        mistakes=journal.mistakes,
        improvements=journal.improvements,
        pnl_summary=pnl_summary,
        trade_count=trade_count
    )
    db.add(db_journal)
    await db.commit()
    await db.refresh(db_journal)
    return db_journal


@router.put("/{date}", response_model=JournalResponse)
async def update_journal(
    date: str,
    journal: JournalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update or create a journal entry for a specific date."""
    result = await db.execute(select(Journal).where(Journal.date == date, Journal.user_id == current_user.id))
    db_journal = result.scalar_one_or_none()

    # Calculate daily stats
    service = AnalysisService()
    all_positions = await service.calculate_positions(db, user_id=current_user.id)
    day_positions = [
        p for p in all_positions
        if p.status == 'closed' and p.exit_time and p.exit_time.strftime('%Y-%m-%d') == date
    ]
    pnl_summary = sum(p.pnl or 0 for p in day_positions)
    trade_count = len(day_positions)

    if db_journal:
        # Update existing journal
        if journal.content is not None:
            db_journal.content = journal.content
        if journal.mood is not None:
            db_journal.mood = journal.mood
        if journal.lessons is not None:
            db_journal.lessons = journal.lessons
        if journal.mistakes is not None:
            db_journal.mistakes = journal.mistakes
        if journal.improvements is not None:
            db_journal.improvements = journal.improvements
        db_journal.pnl_summary = pnl_summary
        db_journal.trade_count = trade_count
    else:
        # Create new journal
        db_journal = Journal(
            user_id=current_user.id,
            date=date,
            content=journal.content,
            mood=journal.mood,
            lessons=journal.lessons,
            mistakes=journal.mistakes,
            improvements=journal.improvements,
            pnl_summary=pnl_summary,
            trade_count=trade_count
        )
        db.add(db_journal)

    await db.commit()
    await db.refresh(db_journal)
    return db_journal


@router.delete("/{date}")
async def delete_journal(
    date: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a journal entry."""
    result = await db.execute(select(Journal).where(Journal.date == date, Journal.user_id == current_user.id))
    db_journal = result.scalar_one_or_none()
    if not db_journal:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    await db.delete(db_journal)
    await db.commit()
    return {"message": f"Journal entry for {date} deleted"}
