FROM python:3.12-slim

WORKDIR /app

# Install Node.js + git
RUN apt-get update && apt-get install -y curl git && \
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

# Build dayTradeDash frontend (private repo, needs GITHUB_TOKEN)
# Change DASH_VERSION to bust cache when dayTradeDash updates
ARG GITHUB_TOKEN=""
ARG DASH_VERSION=4
RUN if [ -n "$GITHUB_TOKEN" ]; then \
      git clone --depth 1 https://x-access-token:${GITHUB_TOKEN}@github.com/zhengxuyu/dayTradeDash.git /tmp/dash-src && \
      cd /tmp/dash-src/frontend && npm install && VITE_API_URL=/api npx vite build --base=/dash/ && \
      mkdir -p /app/dash/dist && cp -r dist/* /app/dash/dist/ && \
      rm -rf /tmp/dash-src; \
    else \
      echo "GITHUB_TOKEN not set, skipping dayTradeDash build"; \
    fi

# Start server
CMD uv run gunicorn backend.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} --timeout 120
