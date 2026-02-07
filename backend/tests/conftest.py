"""
Конфигурация тестов. SQLite in-memory для изоляции от прод-БД.
"""
import os

# Должно быть до импорта app (config читает DATABASE_URL при загрузке)
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.database import engine
from app.main import app


@pytest.fixture(autouse=True)
async def clean_db():
    """Очистка БД перед каждым тестом для изоляции."""
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM reservations"))
        await conn.execute(text("DELETE FROM wishlist_items"))
        await conn.execute(text("DELETE FROM wishlists"))
        await conn.execute(text("DELETE FROM items"))
        await conn.execute(text("DELETE FROM users"))
    yield


@pytest.fixture
async def client():
    """Асинхронный HTTP-клиент для тестов API."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
