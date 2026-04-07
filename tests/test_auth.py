import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_me_endpoint(auth_client: AsyncClient):
    resp = await auth_client.get("/api/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "user-a-uuid"
    assert data["email"] == "testa@test.com"


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"
