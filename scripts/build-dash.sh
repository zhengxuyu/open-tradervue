#!/bin/bash
# Build dayTradeDash frontend and copy to open-tradervue/dash/dist
set -e

DASH_DIR="$(cd "$(dirname "$0")/../../../dayTradeDash/frontend" && pwd)"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/dash/dist"

echo "Building dayTradeDash frontend..."
cd "$DASH_DIR"
npm install
VITE_API_URL=/api npm run build

echo "Copying to $OUT_DIR..."
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp -r dist/* "$OUT_DIR/"

echo "Done! dayTradeDash frontend available at /dash"
