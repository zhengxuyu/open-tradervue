FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install Python dependencies
COPY pyproject.toml README.md ./
RUN uv sync --no-dev

# Copy backend + alembic
COPY backend/ backend/
COPY alembic/ alembic/
COPY alembic.ini .

# Run migrations then start server
CMD uv run alembic upgrade head && uv run gunicorn backend.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} --timeout 120
