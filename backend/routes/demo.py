import logging
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from ..auth import get_current_user, CurrentUser
from ..database import get_db
from ..models.trade import Trade
from ..services.demo_data import generate_demo_trades

logger = logging.getLogger("tradervue.demo")

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.post("/seed")
async def seed_demo_data(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Seed demo trades if user has no trades."""
    # Check if user already has trades
    result = await db.execute(
        select(func.count(Trade.id)).where(Trade.user_id == current_user.id)
    )
    count = result.scalar()
    if count > 0:
        return {"seeded": False, "message": "User already has trades", "trade_count": count}

    # Generate and insert demo trades
    demo_trades = generate_demo_trades(current_user.id, count=50)
    for t in demo_trades:
        trade = Trade(
            user_id=t['user_id'],
            symbol=t['symbol'],
            side=t['side'],
            quantity=t['quantity'],
            price=t['price'],
            executed_at=datetime.fromisoformat(t['executed_at']),
            commission=t['commission'],
            notes=t['notes'],
            tags=t['tags'],
        )
        db.add(trade)

    await db.commit()
    logger.info(f"Seeded {len(demo_trades)} demo trades for user {current_user.id}")
    return {"seeded": True, "trade_count": len(demo_trades)}
