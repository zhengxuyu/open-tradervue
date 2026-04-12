import os
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from ..auth import get_current_user, CurrentUser
from ..database import get_db
from ..models.broker_connection import BrokerConnection
from ..models.trade import Trade
from ..services import snaptrade_service
from .demo import cleanup_demo_trades

logger = logging.getLogger("tradervue.broker")

router = APIRouter(prefix="/api/broker", tags=["broker"])


@router.post("/connect")
async def initiate_broker_connection(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register user with SnapTrade and return connection portal URL."""
    # Check for existing connection
    result = await db.execute(
        select(BrokerConnection).where(BrokerConnection.user_id == current_user.id)
    )
    conn = result.scalar_one_or_none()

    if conn and conn.snaptrade_user_secret:
        # Already registered, just get new login URL
        try:
            url = await snaptrade_service.get_login_url(
                user_id=current_user.id,
                user_secret=conn.snaptrade_user_secret,
                redirect_uri=os.getenv("FRONTEND_URL", "https://tradejournal.dev") + "/settings?broker=connected",
            )
            return {"url": url}
        except Exception:
            pass  # Fall through to re-register

    # Register new SnapTrade user
    try:
        reg = await snaptrade_service.register_user(current_user.id)
    except Exception as e:
        logger.error(f"SnapTrade registration failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to broker service")

    # Save user secret
    if conn:
        conn.snaptrade_user_secret = reg["user_secret"]
        conn.status = "pending"
    else:
        conn = BrokerConnection(
            user_id=current_user.id,
            snaptrade_user_secret=reg["user_secret"],
            status="pending",
        )
        db.add(conn)
    await db.commit()

    # Get login URL
    try:
        url = await snaptrade_service.get_login_url(
            user_id=current_user.id,
            user_secret=reg["user_secret"],
            redirect_uri=os.getenv("FRONTEND_URL", "https://tradejournal.dev") + "/settings?broker=connected",
        )
        return {"url": url}
    except Exception as e:
        logger.error(f"SnapTrade login URL failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate broker connection URL")


@router.get("/accounts")
async def list_broker_accounts(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List connected brokerage accounts."""
    result = await db.execute(
        select(BrokerConnection).where(BrokerConnection.user_id == current_user.id)
    )
    conn = result.scalar_one_or_none()
    if not conn or not conn.snaptrade_user_secret:
        return {"accounts": [], "connected": False}

    try:
        accounts = await snaptrade_service.list_accounts(
            current_user.id, conn.snaptrade_user_secret
        )
        if accounts:
            conn.status = "connected"
            await db.commit()
        return {"accounts": accounts, "connected": True}
    except Exception as e:
        logger.error(f"Failed to list accounts: {e}")
        return {"accounts": [], "connected": False}


class ImportRequest(BaseModel):
    account_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


@router.post("/import")
async def import_broker_trades(
    req: ImportRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import trades from connected broker account."""
    result = await db.execute(
        select(BrokerConnection).where(BrokerConnection.user_id == current_user.id)
    )
    conn = result.scalar_one_or_none()
    if not conn or not conn.snaptrade_user_secret:
        raise HTTPException(status_code=400, detail="No broker connected")

    try:
        activities = await snaptrade_service.get_activities(
            user_id=current_user.id,
            user_secret=conn.snaptrade_user_secret,
            start_date=req.start_date,
            end_date=req.end_date,
            account_id=req.account_id,
        )
    except Exception as e:
        logger.error(f"Failed to fetch activities: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch trades from broker")

    # Import trades into DB
    imported = 0
    skipped = 0
    for activity in activities:
        # Check for duplicates (same symbol, side, quantity, price, time)
        try:
            exec_time = datetime.fromisoformat(activity["executed_at"].replace("Z", "+00:00"))
        except Exception:
            exec_time = datetime.now()

        existing = await db.execute(
            select(Trade).where(
                Trade.user_id == current_user.id,
                Trade.symbol == activity["symbol"],
                Trade.side == activity["side"],
                Trade.executed_at == exec_time,
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        trade = Trade(
            user_id=current_user.id,
            symbol=activity["symbol"],
            side=activity["side"],
            quantity=activity["quantity"],
            price=activity["price"],
            executed_at=exec_time,
            commission=activity["commission"],
            notes=activity.get("notes", ""),
            tags=[],
        )
        db.add(trade)
        imported += 1

    await db.commit()
    if imported > 0:
        await cleanup_demo_trades(current_user.id, db)
    return {"imported": imported, "skipped": skipped, "total": len(activities)}


@router.get("/status")
async def broker_status(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check broker connection status."""
    result = await db.execute(
        select(BrokerConnection).where(BrokerConnection.user_id == current_user.id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        return {"connected": False, "status": "none"}
    return {"connected": conn.status == "connected", "status": conn.status}
