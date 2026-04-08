import os
import logging
from datetime import datetime, date
from typing import Optional
from snaptrade_client import SnapTrade

logger = logging.getLogger("tradervue.snaptrade")

SNAPTRADE_CLIENT_ID = os.getenv("SNAPTRADE_CLIENT_ID", "")
SNAPTRADE_CONSUMER_KEY = os.getenv("SNAPTRADE_CONSUMER_KEY", "")

logger.info(f"SnapTrade config: client_id={'SET' if SNAPTRADE_CLIENT_ID else 'EMPTY'} ({len(SNAPTRADE_CLIENT_ID)} chars), consumer_key={'SET' if SNAPTRADE_CONSUMER_KEY else 'EMPTY'} ({len(SNAPTRADE_CONSUMER_KEY)} chars)")


def get_client() -> SnapTrade:
    if not SNAPTRADE_CLIENT_ID or not SNAPTRADE_CONSUMER_KEY:
        raise ValueError("SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY must be set")
    return SnapTrade(
        consumer_key=SNAPTRADE_CONSUMER_KEY,
        client_id=SNAPTRADE_CLIENT_ID,
    )


async def register_user(user_id: str) -> dict:
    """Register a SnapTrade user. Returns user_id and user_secret."""
    client = get_client()
    try:
        response = client.authentication.register_snap_trade_user(
            user_id=user_id,
        )
        return {"user_id": response.user_id, "user_secret": response.user_secret}
    except Exception as e:
        # User might already exist, try to reset secret
        logger.warning(f"Register failed (may already exist): {e}")
        try:
            response = client.authentication.reset_snap_trade_user_secret(
                user_id=user_id,
                user_secret=None,
            )
            return {"user_id": response.user_id, "user_secret": response.user_secret}
        except Exception as e2:
            logger.error(f"Reset secret also failed: {e2}")
            raise


async def get_login_url(user_id: str, user_secret: str, redirect_uri: str) -> str:
    """Generate a connection portal URL for the user to connect their broker."""
    client = get_client()
    response = client.authentication.login_snap_trade_user(
        user_id=user_id,
        user_secret=user_secret,
        custom_redirect=redirect_uri,
    )
    return response.redirect_uri


async def list_accounts(user_id: str, user_secret: str) -> list:
    """List all connected brokerage accounts."""
    client = get_client()
    response = client.account_information.list_user_accounts(
        user_id=user_id,
        user_secret=user_secret,
    )
    return [
        {
            "id": str(acc.id),
            "name": acc.name,
            "number": acc.number,
            "institution_name": getattr(acc, 'institution_name', 'Unknown'),
        }
        for acc in response
    ]


async def get_activities(
    user_id: str,
    user_secret: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    account_id: Optional[str] = None,
    activity_type: str = "BUY,SELL",
) -> list:
    """Get trade activities (BUY/SELL) for a user."""
    client = get_client()
    kwargs = {
        "user_id": user_id,
        "user_secret": user_secret,
        "type": activity_type,
    }
    if start_date:
        kwargs["start_date"] = start_date
    if end_date:
        kwargs["end_date"] = end_date
    if account_id:
        kwargs["accounts"] = account_id

    response = client.transactions_and_reporting.get_activities(**kwargs)

    trades = []
    for activity in response:
        try:
            trade = {
                "symbol": getattr(activity, 'symbol', {}).get('symbol', 'UNKNOWN') if isinstance(getattr(activity, 'symbol', None), dict) else str(getattr(activity, 'symbol', 'UNKNOWN')),
                "side": activity.type.upper() if hasattr(activity, 'type') else "BUY",
                "quantity": float(getattr(activity, 'units', 0) or 0),
                "price": float(getattr(activity, 'price', 0) or 0),
                "executed_at": str(getattr(activity, 'trade_date', datetime.now().isoformat())),
                "commission": float(getattr(activity, 'fee', 0) or 0),
                "notes": f"Imported from SnapTrade",
            }
            if trade["quantity"] > 0 and trade["price"] > 0:
                trades.append(trade)
        except Exception as e:
            logger.warning(f"Skipping activity: {e}")
            continue

    return trades
