#!/bin/bash
# Open Tradervue - Local Development
# Backend: http://localhost:8000
# Frontend: http://localhost:5173

set -e
trap 'kill 0' EXIT

echo "Starting Open Tradervue..."

# Backend
cd "$(dirname "$0")"
uv run python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &

# Frontend
cd frontend && npm run dev &

wait
