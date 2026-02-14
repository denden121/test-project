"""Тесты API вкладов: просмотр по contributor_secret, отмена, 404."""
import pytest
from httpx import AsyncClient


async def _create_contribution(client: AsyncClient) -> str:
    """Создаёт список, товар с ценой, вклад. Возвращает contributor_secret."""
    create_r = await client.post("/api/wishlists", json={"title": "Список"})
    slug = create_r.json()["slug"]
    creator_secret = create_r.json()["creator_secret"]
    add_r = await client.post(
        f"/api/wishlists/m/{creator_secret}/items",
        json={"title": "Подарок", "price": 1000},
    )
    item_id = add_r.json()["id"]
    contrib_r = await client.post(
        f"/api/wishlists/s/{slug}/items/{item_id}/contribute",
        json={"contributor_name": "Маша", "amount": 300},
    )
    return contrib_r.json()["contributor_secret"]


@pytest.mark.asyncio
async def test_get_my_contribution(client: AsyncClient):
    """Просмотр своего вклада по contributor_secret (T6.4.1)."""
    contributor_secret = await _create_contribution(client)

    r = await client.get(f"/api/contributions/{contributor_secret}")
    assert r.status_code == 200
    data = r.json()
    assert data["contributor_name"] == "Маша"
    assert float(data["amount"]) == 300
    assert data["item_title"] == "Подарок"
    assert "wishlist_item_id" in data
    assert "contributed_at" in data


@pytest.mark.asyncio
async def test_get_contribution_not_found(client: AsyncClient):
    """Невалидный contributor_secret — 404 (T6.4.3)."""
    r = await client.get("/api/contributions/invalid-secret-xyz")
    assert r.status_code == 404
    assert "Вклад не найден" in r.json()["detail"]


@pytest.mark.asyncio
async def test_cancel_contribution(client: AsyncClient):
    """Отмена вклада (T6.4.2)."""
    contributor_secret = await _create_contribution(client)

    r = await client.delete(f"/api/contributions/{contributor_secret}")
    assert r.status_code == 204

    r = await client.get(f"/api/contributions/{contributor_secret}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_cancel_contribution_not_found(client: AsyncClient):
    """Отмена несуществующего вклада — 404."""
    r = await client.delete("/api/contributions/wrong-secret-xyz")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_manage_response_has_no_contributor_details(client: AsyncClient):
    """T6.2.2: GET manage не возвращает владельцу contributor_name/amount по товарам."""
    create_r = await client.post("/api/wishlists", json={"title": "Список"})
    creator_secret = create_r.json()["creator_secret"]
    add_r = await client.post(
        f"/api/wishlists/m/{creator_secret}/items",
        json={"title": "Подарок", "price": 1000},
    )
    item_id = add_r.json()["id"]
    slug = create_r.json()["slug"]
    await client.post(
        f"/api/wishlists/s/{slug}/items/{item_id}/contribute",
        json={"contributor_name": "Тайный", "amount": 300},
    )

    r = await client.get(f"/api/wishlists/m/{creator_secret}")
    assert r.status_code == 200
    data = r.json()
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert "total_contributed" in item
    assert item["total_contributed"] == 300 or float(item["total_contributed"]) == 300
    assert "contributor_name" not in item
    assert "contributions" not in item
