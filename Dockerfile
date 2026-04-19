FROM python:3.12-slim

WORKDIR /app

# Install Node.js for building frontends
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy Python project files and install deps
COPY pyproject.toml README.md ./
COPY backend/ backend/
COPY alembic/ alembic/
COPY alembic.ini .
RUN uv sync --no-dev

# Build open-tradervue frontend
COPY frontend/ frontend/
RUN cd frontend && npm install && npm run build

# Build dayTradeDash frontend (submodule at dash-src/)
COPY dash-src/frontend/ dash-src/frontend/
RUN cd dash-src/frontend && npm install && VITE_API_URL=/api npx vite build --base=/dash/ && \
    mkdir -p /app/dash/dist && cp -r dist/* /app/dash/dist/

# Start server
CMD uv run gunicorn backend.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} --timeout 120
