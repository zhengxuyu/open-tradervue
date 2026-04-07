# Open Tradervue

Open source trading journal and analytics platform. Track trades, analyze performance, and improve your trading with professional-grade statistics.

**Open Tradervue** gives you Tradervue-level analytics in a self-hostable, open source package.

## Features

- **Trade Management** — Import from CSV, manual entry, full CRUD
- **Position Tracking** — Automatic FIFO position calculation from trades
- **Advanced Statistics** — Sharpe ratio, profit factor, win rate, by-hour/day/symbol analysis
- **Market Conditions** — Volume, ATR, gap, volatility cross-analysis
- **Calendar View** — Monthly P&L heatmap with yearly overview
- **Trading Journal** — Daily entries with mood tracking and structured review
- **K-Line Charts** — Interactive candlestick charts with trade entry/exit markers
- **Dark Theme** — Professional Bloomberg Terminal-inspired design

## Quick Start

### Local Development

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/open-tradervue.git
cd open-tradervue

# Copy environment config
cp .env.example .env

# Start backend + frontend
./start.sh
```

Backend: http://localhost:8000 | Frontend: http://localhost:5173 | API Docs: http://localhost:8000/docs

### Docker

```bash
docker build -t open-tradervue .
docker run -p 8000:8000 --env-file .env open-tradervue
```

## Environment Variables

See `.env.example` for all configuration options:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite+aiosqlite:///./tradervue.db` |
| `SECRET_KEY` | JWT signing key | `change-me-in-production` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |
| `ALPHA_VANTAGE_API_KEY` | Market data API key | — |

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy (async), Alembic, Python 3.12
- **Frontend:** React 19, TypeScript, TailwindCSS 4, Recharts, lightweight-charts
- **Database:** SQLite (dev) / PostgreSQL (production)
- **Auth:** JWT (python-jose + bcrypt)

## API Documentation

FastAPI auto-generates OpenAPI docs at `/docs` (Swagger UI) and `/redoc`.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run tests: `uv run pytest tests/ -v`
5. Submit a PR

## Citation Module (Required)

If you use TradeJournal.dev in any deployment, the following attribution must remain visible and unmodified in your application's UI. Removing or hiding it violates the license.

```html
<a href="https://tradejournal.dev" target="_blank" rel="noopener noreferrer">
  Powered by TradeJournal.dev
</a>
```

The built-in `<Citation />` component at `frontend/src/components/Citation.tsx` renders this automatically. Do not remove it.

## License

**TradeJournal.dev License** — see [LICENSE](LICENSE)

- Non-commercial use: free and unlimited, must retain the Citation Module above
- Commercial use: 3% of gross revenue derived from the Software, calculated quarterly
- Commercial license holders may negotiate Citation Module modification
- Contact: yuzxfred@gmail.com
