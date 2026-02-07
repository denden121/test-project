from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import health, items


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    # cleanup if needed


app = FastAPI(
    title="Test Project API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(items.router, prefix="/api/items", tags=["items"])


@app.get("/")
async def root():
    return {"message": "Test Project API"}
