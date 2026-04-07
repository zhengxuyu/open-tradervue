import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "email": "new@example.com",
        "username": "newuser",
        "password": "pass123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@example.com"
    assert data["username"] == "newuser"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "dup@example.com", "username": "user1", "password": "pass123",
    })
    resp = await client.post("/api/auth/register", json={
        "email": "dup@example.com", "username": "user2", "password": "pass123",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "a@example.com", "username": "sameuser", "password": "pass123",
    })
    resp = await client.post("/api/auth/register", json={
        "email": "b@example.com", "username": "sameuser", "password": "pass123",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "login@example.com", "username": "loginuser", "password": "pass123",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "login@example.com", "username": "loginuser", "password": "pass123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "wrong@example.com", "username": "wronguser", "password": "pass123",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "wrong@example.com", "username": "wronguser", "password": "wrongpass",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_without_token(client: AsyncClient):
    resp = await client.get("/api/trades")
    assert resp.status_code == 401
