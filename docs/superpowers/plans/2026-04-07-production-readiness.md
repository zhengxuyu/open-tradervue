# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Open Tradervue production-ready with authentication, Supabase PostgreSQL, Railway deployment, structured logging, tests, and CI/CD.

**Architecture:** JWT auth with user isolation on all models. Supabase PostgreSQL replaces SQLite. Backend deploys to Railway, frontend to Vercel. GitHub Actions runs pytest + tsc on every push.

**Tech Stack:** FastAPI, SQLAlchemy (async), Alembic, python-jose (JWT), Supabase PostgreSQL, Railway, Vercel, pytest, GitHub Actions.

**Strategy:** Open source core + hosted SaaS (Vercel + Supabase + Railway).

---

### Task 1: JWT Authentication System

**Files:**
- Create: `backend/auth.py`
- Create: `backend/models/user.py`
- Create: `backend/routes/auth.py`
- Modify: `backend/database.py`
- Modify: `backend/models/__init__.py`
- Modify: `backend/routes/__init__.py`
- Modify: `backend/main.py`
- Modify: `pyproject.toml`

- [ ] **Step 1: Add auth dependencies to pyproject.toml**

Add to the `dependencies` list in `pyproject.toml`:
```
"python-jose[cryptography]>=3.3.0",
"passlib[bcrypt]>=1.7.4",
```

Run: `uv sync`

- [ ] **Step 2: Create User model**

Create `backend/models/user.py`:
```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

Update `backend/models/__init__.py` to export User.

- [ ] **Step 3: Create auth module**

Create `backend/auth.py`:
```python
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .models.user import User

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user
```

- [ ] **Step 4: Create auth routes**

Create `backend/routes/auth.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.user import User
from ..auth import verify_password, get_password_hash, create_access_token
from ..schemas import UserCreate, UserResponse, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check username uniqueness
    result = await db.execute(select(User).where(User.username == user.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=get_password_hash(user.password),
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    from ..auth import get_current_user
    return current_user
```

- [ ] **Step 5: Add auth schemas to schemas.py**

Add to `backend/schemas.py`:
```python
class UserCreate(BaseModel):
    email: str
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
```

- [ ] **Step 6: Add user_id to Trade model + all existing models**

Add `user_id = Column(Integer, nullable=False, index=True)` to Trade, Position, Journal, DailyMarketData models. This scopes all data to a user.

- [ ] **Step 7: Add user filtering to all routes**

In every route file (trades.py, analysis.py, calendar.py, journal.py, market_data.py):
- Add `from ..auth import get_current_user` and `from ..models.user import User`
- Add `current_user: User = Depends(get_current_user)` to each endpoint
- Add `.where(Trade.user_id == current_user.id)` (or equivalent model) to all queries
- Set `user_id=current_user.id` on all creates

- [ ] **Step 8: Register auth router in main.py**

Add to `backend/main.py`:
```python
from .routes.auth import router as auth_router
app.include_router(auth_router)
```

- [ ] **Step 9: Commit**

```bash
git add -A backend/ pyproject.toml
git commit -m "feat: add JWT authentication + user isolation"
```

---

### Task 2: Supabase PostgreSQL Migration

**Files:**
- Modify: `backend/database.py`
- Modify: `pyproject.toml`
- Create: `alembic.ini`
- Create: `alembic/` directory structure
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Add PostgreSQL + Alembic dependencies**

Add to `pyproject.toml` dependencies:
```
"asyncpg>=0.29.0",
"alembic>=1.13.0",
```

Remove `aiosqlite` from dependencies (no longer needed for production).

Run: `uv sync`

- [ ] **Step 2: Update database.py for PostgreSQL**

Replace `backend/database.py`:
```python
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/tradervue")

engine = create_async_engine(DATABASE_URL, echo=False, pool_size=5, max_overflow=10)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    from .models import Trade, Position, Journal, DailyMarketData
    from .models.market_data import SymbolInfo
    from .models.user import User  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

- [ ] **Step 3: Initialize Alembic**

```bash
cd /Volumes/data/open-tradervue
uv run alembic init alembic
```

Edit `alembic/env.py` to use async engine and import Base from database.py.
Edit `alembic.ini` to read DATABASE_URL from environment.

- [ ] **Step 4: Create initial migration**

```bash
uv run alembic revision --autogenerate -m "initial schema with users"
```

- [ ] **Step 5: Create .env.example**

Create `.env.example`:
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/tradervue
SECRET_KEY=change-me-to-a-random-string
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALPHA_VANTAGE_API_KEY=your-key-here
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

- [ ] **Step 6: Remove .env from git history**

```bash
git rm --cached .env
echo ".env" >> .gitignore  # already there but ensure
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: migrate to PostgreSQL + Alembic migrations"
```

---

### Task 3: Production Server + CORS + Logging

**Files:**
- Modify: `backend/main.py`
- Modify: `pyproject.toml`

- [ ] **Step 1: Add gunicorn dependency**

Add to `pyproject.toml`:
```
"gunicorn>=21.0.0",
```

- [ ] **Step 2: Rewrite main.py with logging, CORS from env, error handling**

```python
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("tradervue")

from .database import init_db
from .routes import trades_router, analysis_router, calendar_router, market_data_router, journal_router
from .routes.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Open Tradervue API")
    await init_db()
    yield
    logger.info("Shutting down Open Tradervue API")


app = FastAPI(
    title="Open Tradervue",
    description="Open source trading journal and analysis platform",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS from environment
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth_router)
app.include_router(trades_router)
app.include_router(analysis_router)
app.include_router(calendar_router)
app.include_router(market_data_router)
app.include_router(journal_router)


@app.get("/")
async def root():
    return {"message": "Open Tradervue API", "version": "0.2.0", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


def main():
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
```

- [ ] **Step 3: Commit**

```bash
git add backend/main.py pyproject.toml
git commit -m "feat: add structured logging, CORS from env, global error handler"
```

---

### Task 4: Frontend Auth (Login/Register Pages)

**Files:**
- Create: `frontend/src/pages/Login.tsx`
- Create: `frontend/src/pages/Register.tsx`
- Create: `frontend/src/services/auth.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Create auth service**

Create `frontend/src/services/auth.ts`:
- `login(email, password)` — POST to `/api/auth/login`, store token in localStorage
- `register(email, username, password)` — POST to `/api/auth/register`
- `logout()` — clear localStorage
- `getToken()` — read from localStorage
- `isAuthenticated()` — check if token exists and not expired

- [ ] **Step 2: Update api.ts to attach JWT token**

Add an axios request interceptor that reads the token from localStorage and sets `Authorization: Bearer {token}` header on every request.

- [ ] **Step 3: Create Login page**

Dark theme design matching the app. Email + password fields, login button, link to register. On success, redirect to `/`.

- [ ] **Step 4: Create Register page**

Email + username + password + confirm password. On success, auto-login and redirect.

- [ ] **Step 5: Add auth routes to App.tsx**

Add `/login` and `/register` routes. Wrap protected routes in an auth guard that redirects to `/login` if not authenticated.

- [ ] **Step 6: Update Layout to show logout**

Add logout button in Sidebar bottom section. Show username from token.

- [ ] **Step 7: Commit**

```bash
git add -A frontend/src/
git commit -m "feat: add Login/Register pages + JWT auth flow"
```

---

### Task 5: Deployment Configuration

**Files:**
- Create: `Dockerfile`
- Create: `railway.json`
- Create: `frontend/vercel.json`
- Create: `Procfile`
- Modify: `start.sh`

- [ ] **Step 1: Create Dockerfile for Railway**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev

COPY backend/ backend/
COPY alembic/ alembic/
COPY alembic.ini .

# Run migrations then start server
CMD uv run alembic upgrade head && uv run gunicorn backend.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000}
```

- [ ] **Step 2: Create railway.json**

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

- [ ] **Step 3: Create vercel.json for frontend**

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Frontend API calls need to point to the Railway backend URL. Update `frontend/src/services/api.ts` to read `VITE_API_URL` environment variable:
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})
```

- [ ] **Step 4: Update start.sh for local development**

```bash
#!/bin/bash
# Local development: run backend + frontend
trap 'kill 0' EXIT
cd "$(dirname "$0")"
uv run python -m backend.main &
cd frontend && npm run dev &
wait
```

- [ ] **Step 5: Commit**

```bash
git add Dockerfile railway.json frontend/vercel.json Procfile start.sh frontend/src/services/api.ts
git commit -m "feat: add Dockerfile, Railway + Vercel deployment config"
```

---

### Task 6: Frontend Static Serving (Backend)

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Add static file serving**

Add to `backend/main.py` after all route registrations:
```python
from fastapi.staticfiles import StaticFiles
import os

# Serve frontend static files in production
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
```

This serves the Vite build output when it exists (production), but doesn't break development where Vite dev server handles the frontend.

- [ ] **Step 2: Commit**

```bash
git add backend/main.py
git commit -m "feat: serve frontend static files from backend in production"
```

---

### Task 7: Backend API Tests

**Files:**
- Create: `tests/conftest.py`
- Create: `tests/test_auth.py`
- Create: `tests/test_trades.py`
- Create: `tests/test_analysis.py`
- Create: `tests/test_import.py`

- [ ] **Step 1: Create test fixtures**

Create `tests/conftest.py` with:
- Async test database (SQLite in-memory for tests)
- Test client using `httpx.AsyncClient`
- Fixture to create a test user and get auth token
- Fixture to seed sample trades

- [ ] **Step 2: Write auth tests (~5 tests)**

`tests/test_auth.py`:
- test_register_success
- test_register_duplicate_email
- test_login_success
- test_login_wrong_password
- test_protected_route_without_token

- [ ] **Step 3: Write trade CRUD tests (~8 tests)**

`tests/test_trades.py`:
- test_create_trade
- test_get_trades
- test_get_trades_filtered_by_symbol
- test_update_trade
- test_delete_trade
- test_trades_isolated_by_user (user A can't see user B's trades)
- test_csv_import
- test_csv_import_empty

- [ ] **Step 4: Write analysis tests (~5 tests)**

`tests/test_analysis.py`:
- test_analysis_summary
- test_analysis_by_symbol
- test_analysis_by_date
- test_advanced_statistics
- test_analysis_empty_data

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add tests/
git commit -m "test: add backend API tests (auth, trades, analysis)"
```

---

### Task 8: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
      - run: uv sync
      - run: uv run pytest tests/ -v

  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions for backend tests + frontend build"
```

---

### Task 9: Documentation + Cleanup

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Write README.md**

Complete README with:
- Project description + screenshot placeholder
- Features list
- Quick start (Docker + local dev)
- Environment variables reference
- API documentation link (/docs)
- Contributing guide (brief)
- License (choose MIT or AGPL)

- [ ] **Step 2: Ensure .env is not in git**

```bash
git rm --cached .env 2>/dev/null || true
# Verify
git status
```

- [ ] **Step 3: Final build verification**

```bash
cd frontend && npm run build
uv run pytest tests/ -v
```

- [ ] **Step 4: Commit**

```bash
git add README.md .gitignore .env.example
git commit -m "docs: add README, .env.example, project documentation"
```
