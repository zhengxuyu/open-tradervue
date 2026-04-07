import pytest
from httpx import AsyncClient


async def _create_closed_position(client: AsyncClient, symbol: str, buy_price: float, sell_price: float, quantity: int = 100):
    """Helper: create a BUY then a SELL to form a closed position."""
    await client.post("/api/trades", json={
        "symbol": symbol, "side": "BUY", "quantity": quantity,
        "price": buy_price, "executed_at": "2024-01-15T10:00:00", "commission": 1.0,
    })
    await client.post("/api/trades", json={
        "symbol": symbol, "side": "SELL", "quantity": quantity,
        "price": sell_price, "executed_at": "2024-01-15T14:00:00", "commission": 1.0,
    })


@pytest.mark.asyncio
async def test_analysis_summary(auth_client: AsyncClient):
    """Create trades that form closed positions, verify summary shape."""
    # Winning trade: buy 100 @ 150, sell 100 @ 160
    await _create_closed_position(auth_client, "AAPL", 150.0, 160.0)
    # Losing trade: buy 50 @ 200, sell 50 @ 190
    await _create_closed_position(auth_client, "TSLA", 200.0, 190.0, quantity=50)

    resp = await auth_client.get("/api/analysis/summary")
    assert resp.status_code == 200
    data = resp.json()

    # Verify response has all expected fields
    assert "total_trades" in data
    assert "total_pnl" in data
    assert "win_count" in data
    assert "loss_count" in data
    assert "win_rate" in data
    assert "profit_factor" in data

    assert data["total_trades"] == 2
    assert data["win_count"] >= 1
    assert data["loss_count"] >= 1


@pytest.mark.asyncio
async def test_analysis_by_symbol(auth_client: AsyncClient):
    """Verify grouping by symbol."""
    await _create_closed_position(auth_client, "AAPL", 150.0, 160.0)
    await _create_closed_position(auth_client, "AAPL", 155.0, 165.0)
    await _create_closed_position(auth_client, "TSLA", 200.0, 210.0)

    resp = await auth_client.get("/api/analysis/by-symbol")
    assert resp.status_code == 200
    data = resp.json()

    symbols = {item["symbol"] for item in data}
    assert "AAPL" in symbols
    assert "TSLA" in symbols

    aapl = next(item for item in data if item["symbol"] == "AAPL")
    assert aapl["total_trades"] == 2


@pytest.mark.asyncio
async def test_positions_calculated(auth_client: AsyncClient):
    """Verify GET /api/positions returns calculated positions from trades."""
    # Create a closed position
    await _create_closed_position(auth_client, "NVDA", 800.0, 850.0, quantity=10)
    # Create an open position (only buy, no sell)
    await auth_client.post("/api/trades", json={
        "symbol": "AMD", "side": "BUY", "quantity": 20,
        "price": 150.0, "executed_at": "2024-01-16T10:00:00", "commission": 0.5,
    })

    resp = await auth_client.get("/api/positions")
    assert resp.status_code == 200
    positions = resp.json()
    assert len(positions) == 2

    statuses = {p["status"] for p in positions}
    assert "closed" in statuses
    assert "open" in statuses


@pytest.mark.asyncio
async def test_analysis_empty(auth_client: AsyncClient):
    """Verify empty data returns sensible defaults, not 500."""
    resp = await auth_client.get("/api/analysis/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_trades"] == 0
    assert data["total_pnl"] == 0.0
    assert data["win_rate"] == 0.0
