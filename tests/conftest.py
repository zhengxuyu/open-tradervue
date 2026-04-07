import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Use in-memory SQLite for tests
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"

from backend.main import app
from backend.database import Base, get_db
from backend.auth import get_current_user, CurrentUser

# Create test engine
test_engine = create_async_engine("sqlite+aiosqlite://", echo=False)
test_session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with test_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


# Mock user for tests
mock_user_a = CurrentUser(id="user-a-uuid", email="testa@test.com")
mock_user_b = CurrentUser(id="user-b-uuid", email="testb@test.com")


async def override_get_current_user():
    return mock_user_a


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient):
    """Client authenticated as user A (default mock user)."""
    return client


@pytest_asyncio.fixture
async def user_b_client():
    """Client authenticated as user B (for isolation tests)."""
    async def override_user_b():
        return mock_user_b
    app.dependency_overrides[get_current_user] = override_user_b
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Restore user A
    app.dependency_overrides[get_current_user] = override_get_current_user
