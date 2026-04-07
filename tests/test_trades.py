import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_trade(auth_client: AsyncClient):
    resp = await auth_client.post("/api/trades", json={
        "symbol": "AAPL",
        "side": "BUY",
        "quantity": 100,
        "price": 150.0,
        "executed_at": "2024-01-15T10:30:00",
        "commission": 1.0,
        "notes": "Test trade",
        "tags": ["test"],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["symbol"] == "AAPL"
    assert data["side"] == "BUY"
    assert data["quantity"] == 100


@pytest.mark.asyncio
async def test_get_trades(auth_client: AsyncClient):
    await auth_client.post("/api/trades", json={
        "symbol": "TSLA", "side": "BUY", "quantity": 50,
        "price": 200.0, "executed_at": "2024-01-15T10:30:00",
        "commission": 0.5,
    })
    resp = await auth_client.get("/api/trades")
    assert resp.status_code == 200
    trades = resp.json()
    assert len(trades) >= 1


@pytest.mark.asyncio
async def test_get_trades_filtered_by_symbol(auth_client: AsyncClient):
    await auth_client.post("/api/trades", json={
        "symbol": "NVDA", "side": "BUY", "quantity": 10,
        "price": 800.0, "executed_at": "2024-01-15T10:30:00", "commission": 0.5,
    })
    await auth_client.post("/api/trades", json={
        "symbol": "AMD", "side": "SELL", "quantity": 20,
        "price": 150.0, "executed_at": "2024-01-15T11:00:00", "commission": 0.5,
    })
    resp = await auth_client.get("/api/trades", params={"symbol": "NVDA"})
    assert resp.status_code == 200
    trades = resp.json()
    assert len(trades) == 1
    assert all(t["symbol"] == "NVDA" for t in trades)


@pytest.mark.asyncio
async def test_get_single_trade(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/trades", json={
        "symbol": "MSFT", "side": "BUY", "quantity": 25,
        "price": 400.0, "executed_at": "2024-01-15T10:30:00", "commission": 0.5,
    })
    trade_id = create_resp.json()["id"]
    resp = await auth_client.get(f"/api/trades/{trade_id}")
    assert resp.status_code == 200
    assert resp.json()["symbol"] == "MSFT"


@pytest.mark.asyncio
async def test_update_trade(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/trades", json={
        "symbol": "META", "side": "BUY", "quantity": 30,
        "price": 300.0, "executed_at": "2024-01-15T10:30:00", "commission": 0.5,
    })
    trade_id = create_resp.json()["id"]
    resp = await auth_client.put(f"/api/trades/{trade_id}", json={"quantity": 50})
    assert resp.status_code == 200
    assert resp.json()["quantity"] == 50


@pytest.mark.asyncio
async def test_delete_trade(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/trades", json={
        "symbol": "GOOG", "side": "BUY", "quantity": 10,
        "price": 140.0, "executed_at": "2024-01-15T10:30:00", "commission": 0.5,
    })
    trade_id = create_resp.json()["id"]
    resp = await auth_client.delete(f"/api/trades/{trade_id}")
    assert resp.status_code == 204

    resp = await auth_client.get(f"/api/trades/{trade_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_nonexistent_trade(auth_client: AsyncClient):
    resp = await auth_client.get("/api/trades/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_trades_isolated_by_user(auth_client: AsyncClient):
    """User A's trades should not be visible to User B."""
    from backend.main import app
    from backend.auth import get_current_user, CurrentUser

    # User A creates a trade
    await auth_client.post("/api/trades", json={
        "symbol": "SPY", "side": "BUY", "quantity": 100,
        "price": 450.0, "executed_at": "2024-01-15T10:30:00", "commission": 1.0,
    })

    # Switch to user B
    async def override_user_b():
        return CurrentUser(id="user-b-uuid", email="b@test.com")
    app.dependency_overrides[get_current_user] = override_user_b

    # User B should see zero trades
    resp = await auth_client.get("/api/trades")
    assert resp.status_code == 200
    assert len(resp.json()) == 0

    # Restore user A
    async def override_user_a():
        return CurrentUser(id="user-a-uuid", email="testa@test.com")
    app.dependency_overrides[get_current_user] = override_user_a
