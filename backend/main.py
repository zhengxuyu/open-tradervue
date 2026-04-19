import os
import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("tradervue")

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

from .database import init_db
from .routes import trades_router, analysis_router, calendar_router, market_data_router, journal_router, scanner_router
from .routes.auth import router as auth_router
from .routes.stripe import router as stripe_router
from .routes.broker import router as broker_router
from .routes.demo import router as demo_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Open Tradervue API")
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down Open Tradervue API")


app = FastAPI(
    title="Open Tradervue",
    description="Trading journal and analysis platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration from environment
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
origins = [origin.strip() for origin in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception on %s %s: %s\n%s",
        request.method,
        request.url.path,
        str(exc),
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(auth_router)
app.include_router(stripe_router)
app.include_router(trades_router)
app.include_router(analysis_router)
app.include_router(calendar_router)
app.include_router(market_data_router)
app.include_router(journal_router)
app.include_router(broker_router)
app.include_router(demo_router)
app.include_router(scanner_router)


@app.get("/")
async def root():
    return {"message": "Open Tradervue API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Serve frontend static files in production
import os as _os
from pathlib import Path as _Path

# Serve Day Trade Dash frontend at /dash
_dash_dist = _Path(__file__).parent.parent / "dash" / "dist"
if _dash_dist.is_dir():
    from fastapi.staticfiles import StaticFiles as _DashStaticFiles
    app.mount("/dash", _DashStaticFiles(directory=str(_dash_dist), html=True), name="dash")

_frontend_dist = _Path(__file__).parent.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="frontend")


def main():
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
