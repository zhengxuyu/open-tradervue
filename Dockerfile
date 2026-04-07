FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy everything first, then install
COPY pyproject.toml README.md ./
COPY backend/ backend/
COPY alembic/ alembic/
COPY alembic.ini .

# Install Python dependencies
RUN uv sync --no-dev

# Start server
CMD uv run gunicorn backend.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} --timeout 120
