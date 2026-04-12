import random
from datetime import datetime, timedelta
from typing import List

SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'AMD', 'META', 'MSFT', 'GOOG', 'AMZN', 'SPY', 'QQQ']

PRICE_RANGES = {
    'AAPL': (170, 195),
    'TSLA': (160, 280),
    'NVDA': (800, 950),
    'AMD': (140, 185),
    'META': (450, 550),
    'MSFT': (380, 430),
    'GOOG': (155, 180),
    'AMZN': (175, 210),
    'SPY': (520, 560),
    'QQQ': (440, 490),
}


def generate_demo_trades(user_id: str, count: int = 50) -> List[dict]:
    """Generate realistic demo trades for a new user."""
    trades = []
    now = datetime.utcnow()

    for i in range(count):
        # Spread across last 30 days, during market hours (9:30-16:00 ET)
        days_ago = random.randint(0, 29)
        hour = random.randint(9, 15)
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        trade_time = now - timedelta(days=days_ago, hours=random.randint(0, 5))
        trade_time = trade_time.replace(hour=hour, minute=minute, second=second)

        symbol = random.choice(SYMBOLS)
        price_low, price_high = PRICE_RANGES[symbol]
        base_price = random.uniform(price_low, price_high)

        # Generate a BUY and matching SELL (closed position)
        quantity = random.choice([10, 25, 50, 100, 200, 500])

        # 60% chance of profit
        is_winner = random.random() < 0.60
        if is_winner:
            price_change = random.uniform(0.1, 3.0)
        else:
            price_change = -random.uniform(0.1, 4.0)

        entry_price = round(base_price, 2)
        exit_price = round(base_price + price_change, 2)
        commission = round(random.uniform(0.5, 2.5), 2)

        # Entry trade (BUY)
        entry_time = trade_time
        trades.append({
            'user_id': user_id,
            'symbol': symbol,
            'side': 'BUY',
            'quantity': quantity,
            'price': entry_price,
            'executed_at': entry_time.isoformat(),
            'commission': commission,
            'notes': 'Demo trade',
            'tags': ['demo'],
        })

        # Exit trade (SELL) - 5 minutes to 4 hours later
        hold_minutes = random.randint(5, 240)
        exit_time = entry_time + timedelta(minutes=hold_minutes)
        trades.append({
            'user_id': user_id,
            'symbol': symbol,
            'side': 'SELL',
            'quantity': quantity,
            'price': exit_price,
            'executed_at': exit_time.isoformat(),
            'commission': commission,
            'notes': 'Demo trade',
            'tags': ['demo'],
        })

    # Sort by executed_at
    trades.sort(key=lambda t: t['executed_at'])
    return trades
