import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    """Health endpoint возвращает status ok."""
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_test_endpoint(client: AsyncClient):
    """Тестовая ручка для проверки связи."""
    r = await client.get("/api/test")
    assert r.status_code == 200
    data = r.json()
    assert data["message"] == "Test OK"
    assert "timestamp" in data
    assert data["source"] == "backend"


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    """Корневой endpoint."""
    r = await client.get("/")
    assert r.status_code == 200
    assert "message" in r.json()
