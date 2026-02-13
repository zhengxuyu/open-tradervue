from sqlalchemy import Column, Integer, String, Float, Date, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from ..database import Base


class SymbolInfo(Base):
    """Store static symbol information like float, market cap, etc."""
    __tablename__ = "symbol_info"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, unique=True, index=True)

    # Float and shares
    float_shares = Column(Float, nullable=True)  # 流通股数量
    shares_outstanding = Column(Float, nullable=True)  # 总股本
    float_percent = Column(Float, nullable=True)  # 流通股占比 %

    # Market info
    market_cap = Column(Float, nullable=True)  # 市值
    avg_volume_10d = Column(Float, nullable=True)  # 10日平均成交量
    sector = Column(String(100), nullable=True)  # 行业
    industry = Column(String(100), nullable=True)  # 细分行业

    # Timestamps
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<SymbolInfo {self.symbol} float={self.float_shares}>"


class DailyMarketData(Base):
    """Store daily market data for each symbol."""
    __tablename__ = "daily_market_data"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)

    # OHLCV
    open = Column(Float, nullable=True)
    high = Column(Float, nullable=True)
    low = Column(Float, nullable=True)
    close = Column(Float, nullable=True)
    volume = Column(Float, nullable=True)

    # Calculated indicators
    volume_50ma = Column(Float, nullable=True)  # 50-day MA of volume
    sma_50 = Column(Float, nullable=True)  # 50-day SMA of close
    atr_14 = Column(Float, nullable=True)  # 14-day ATR

    # Derived metrics (calculated from OHLCV)
    gap_pct = Column(Float, nullable=True)  # Opening gap %
    day_range_pct = Column(Float, nullable=True)  # (High-Low)/Open %
    true_range = Column(Float, nullable=True)
    day_type = Column(String(20), nullable=True)  # trend_up, trend_down, range, etc.

    __table_args__ = (
        UniqueConstraint('symbol', 'date', name='uix_symbol_date'),
    )

    def __repr__(self):
        return f"<DailyMarketData {self.symbol} {self.date}>"
