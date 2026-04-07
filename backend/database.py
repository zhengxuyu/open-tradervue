import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./tradervue.db")
print(f"[DATABASE] URL starts with: {DATABASE_URL[:30]}...", flush=True)

# Handle various DATABASE_URL formats
_is_postgres = False
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    _is_postgres = True
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    _is_postgres = True
elif DATABASE_URL.startswith("postgresql+asyncpg://"):
    _is_postgres = True

# asyncpg needs explicit SSL context for Supabase
_connect_args = {}
if _is_postgres:
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    _connect_args = {"ssl": ssl_context}

print(f"[DATABASE] is_postgres={_is_postgres}, final URL: {DATABASE_URL[:40]}...", flush=True)
engine = create_async_engine(DATABASE_URL, echo=False, connect_args=_connect_args)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    from .models import Trade, Position, Journal, DailyMarketData  # noqa: F401
    from .models.market_data import SymbolInfo  # noqa: F401
    from .models.user import User  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
