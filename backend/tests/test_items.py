import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_items_empty(client: AsyncClient):
    """Список items пуст по умолчанию."""
    r = await client.get("/api/items")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_create_item(client: AsyncClient):
    """Создание item (legacy)."""
    r = await client.post(
        "/api/items",
        json={"title": "Item 1", "description": "Test"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Item 1"
    assert data["description"] == "Test"


@pytest.mark.asyncio
async def test_list_items(client: AsyncClient):
    """Список items после создания."""
    await client.post(
        "/api/items",
        json={"title": "A", "description": "Desc"},
    )
    r = await client.get("/api/items")
    assert r.status_code == 200
    assert len(r.json()) >= 1
    titles = [i["title"] for i in r.json()]
    assert "A" in titles
