from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base


class Journal(Base):
    __tablename__ = "journals"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, unique=True, index=True)  # YYYY-MM-DD format
    content = Column(Text, nullable=True)  # Main journal content/notes
    mood = Column(String(20), nullable=True)  # e.g., 'good', 'neutral', 'bad'
    lessons = Column(Text, nullable=True)  # Key lessons learned
    mistakes = Column(Text, nullable=True)  # Mistakes made
    improvements = Column(Text, nullable=True)  # Areas for improvement
    pnl_summary = Column(Float, nullable=True)  # Daily P&L summary (auto-calculated)
    trade_count = Column(Integer, nullable=True)  # Number of trades that day
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Journal {self.date}>"
