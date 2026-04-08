import os
import logging
from datetime import datetime
from typing import Optional
from snaptrade_client import SnapTrade

logger = logging.getLogger("tradervue.snaptrade")

SNAPTRADE_CLIENT_ID = os.getenv("SNAPTRADE_CLIENT_ID", "")
SNAPTRADE_CONSUMER_KEY = os.getenv("SNAPTRADE_CONSUMER_KEY", "")


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
        response = client.authentication.register_snap_trade_user(user_id=user_id)
        body = response.body
        return {"user_id": body["userId"], "user_secret": body["userSecret"]}
    except Exception as e:
        logger.warning(f"Register failed (may already exist): {e}")
        raise


async def get_login_url(user_id: str, user_secret: str, redirect_uri: str) -> str:
    """Generate a connection portal URL for the user to connect their broker."""
    client = get_client()
    response = client.authentication.login_snap_trade_user(
        user_id=user_id,
        user_secret=user_secret,
        custom_redirect=redirect_uri,
    )
    return response.body.get("redirectURI", response.body.get("redirect_uri", ""))


async def list_accounts(user_id: str, user_secret: str) -> list:
    """List all connected brokerage accounts."""
    client = get_client()
    response = client.account_information.list_user_accounts(
        user_id=user_id,
        user_secret=user_secret,
    )
    accounts = response.body if isinstance(response.body, list) else []
    return [
        {
            "id": str(acc.get("id", "")),
            "name": acc.get("name", "Unknown"),
            "number": acc.get("number", ""),
            "institution_name": acc.get("institution_name", acc.get("institutionName", "Unknown")),
        }
        for acc in accounts
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
    activities = response.body if isinstance(response.body, list) else []

    trades = []
    for activity in activities:
        try:
            # Handle symbol field (can be dict or string)
            symbol_raw = activity.get("symbol", {})
            if isinstance(symbol_raw, dict):
                symbol = symbol_raw.get("symbol", symbol_raw.get("rawSymbol", "UNKNOWN"))
            else:
                symbol = str(symbol_raw) if symbol_raw else "UNKNOWN"

            trade = {
                "symbol": symbol,
                "side": activity.get("type", "BUY").upper(),
                "quantity": float(activity.get("units", 0) or 0),
                "price": float(activity.get("price", 0) or 0),
                "executed_at": str(activity.get("trade_date", activity.get("tradeDate", datetime.now().isoformat()))),
                "commission": float(activity.get("fee", 0) or 0),
                "notes": "Imported from SnapTrade",
            }
            if trade["quantity"] > 0 and trade["price"] > 0:
                trades.append(trade)
        except Exception as e:
            logger.warning(f"Skipping activity: {e}")
            continue

    return trades
