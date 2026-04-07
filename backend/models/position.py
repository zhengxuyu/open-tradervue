from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from ..database import Base


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)
    quantity = Column(Float, nullable=False)
    pnl = Column(Float, nullable=True)
    pnl_percent = Column(Float, nullable=True)
    entry_time = Column(DateTime, nullable=False)
    exit_time = Column(DateTime, nullable=True)
    holding_days = Column(Integer, nullable=True)
    status = Column(String(20), default="open")  # open or closed
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Market data at entry time
    # Volume metrics
    entry_volume = Column(Float, nullable=True)  # Volume on entry day
    volume_50ma = Column(Float, nullable=True)  # 50-day MA of volume
    relative_volume = Column(Float, nullable=True)  # entry_volume / volume_50ma * 100
    prior_day_rel_volume = Column(Float, nullable=True)  # Prior day's relative volume %

    # Price movement metrics
    opening_gap_pct = Column(Float, nullable=True)  # Gap % from prior close
    day_movement_pct = Column(Float, nullable=True)  # Intraday range %
    day_type = Column(String(20), nullable=True)  # trend_up, trend_down, range, reversal

    # Volatility metrics
    atr_14 = Column(Float, nullable=True)  # 14-day ATR
    true_range = Column(Float, nullable=True)  # True range on entry day
    entry_pct_of_atr = Column(Float, nullable=True)  # Entry position in day's range vs ATR
    relative_volatility = Column(Float, nullable=True)  # TR / ATR

    # Trend metrics
    sma_50 = Column(Float, nullable=True)  # 50-day SMA
    price_vs_sma50_pct = Column(Float, nullable=True)  # % above/below 50-day SMA

    def __repr__(self):
        return f"<Position {self.id}: {self.symbol} {self.status}>"
