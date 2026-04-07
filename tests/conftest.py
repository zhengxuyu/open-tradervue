import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Use in-memory SQLite for tests — must be set before importing backend
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"

from backend.main import app
from backend.database import Base, get_db

# Create test engine
test_engine = create_async_engine("sqlite+aiosqlite://", echo=False)
test_session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with test_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    """Async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient):
    """Client with authenticated user."""
    # Register user
    await client.post("/api/auth/register", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpass123",
    })
    # Login — the login endpoint uses UserCreate JSON body, not form data
    resp = await client.post("/api/auth/login", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpass123",
    })
    token = resp.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
