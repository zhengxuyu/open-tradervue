from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env file
load_dotenv()

from .database import init_db
from .routes import trades_router, analysis_router, calendar_router, market_data_router, journal_router
from .routes.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Open Tradervue",
    description="Trading journal and analysis platform",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(trades_router)
app.include_router(analysis_router)
app.include_router(calendar_router)
app.include_router(market_data_router)
app.include_router(journal_router)


@app.get("/")
async def root():
    return {"message": "Open Tradervue API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


def main():
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
