import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./tradervue.db")

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

# asyncpg + Supabase pgbouncer: need SSL + disable statement cache
_connect_args = {}
_engine_kwargs = {}
if _is_postgres:
    _connect_args = {"ssl": "require", "statement_cache_size": 0}
    _engine_kwargs = {"pool_pre_ping": True}

engine = create_async_engine(DATABASE_URL, echo=False, connect_args=_connect_args, **_engine_kwargs)
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
    from .models.subscription import Subscription  # noqa: F401
    from .models.broker_connection import BrokerConnection  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
