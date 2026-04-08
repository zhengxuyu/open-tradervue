from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from ..database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), unique=True, nullable=False, index=True)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    status = Column(String(50), default="inactive")  # active, inactive, canceled, past_due
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
