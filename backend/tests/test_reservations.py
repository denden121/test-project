import pytest
from httpx import AsyncClient


async def _create_reservation(client: AsyncClient) -> str:
    """Хелпер: создаёт список, добавляет товар, резервирует. Возвращает reserver_secret."""
    create_r = await client.post("/api/wishlists", json={"title": "Список"})
    slug = create_r.json()["slug"]
    creator_secret = create_r.json()["creator_secret"]
    add_r = await client.post(
        f"/api/wishlists/m/{creator_secret}/items",
        json={"title": "Подарок для теста"},
    )
    item_id = add_r.json()["id"]
    reserve_r = await client.post(
        f"/api/wishlists/s/{slug}/items/{item_id}/reserve",
        json={"reserver_name": "Тестер"},
    )
    return reserve_r.json()["reserver_secret"]


@pytest.mark.asyncio
async def test_get_my_reservation(client: AsyncClient):
    """Просмотр своей резервации по reserver_secret."""
    reserver_secret = await _create_reservation(client)

    r = await client.get(f"/api/reservations/{reserver_secret}")
    assert r.status_code == 200
    data = r.json()
    assert data["reserver_name"] == "Тестер"
    assert data["item_title"] == "Подарок для теста"
    assert "wishlist_item_id" in data
    assert "reserved_at" in data


@pytest.mark.asyncio
async def test_get_reservation_not_found(client: AsyncClient):
    """Просмотр несуществующей резервации — 404."""
    r = await client.get("/api/reservations/wrong-secret-xyz")
    assert r.status_code == 404
    assert "Резервация не найдена" in r.json()["detail"]


@pytest.mark.asyncio
async def test_cancel_reservation(client: AsyncClient):
    """Отмена резервации."""
    reserver_secret = await _create_reservation(client)

    r = await client.delete(f"/api/reservations/{reserver_secret}")
    assert r.status_code == 204

    r = await client.get(f"/api/reservations/{reserver_secret}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_cancel_reservation_not_found(client: AsyncClient):
    """Отмена несуществующей резервации — 404."""
    r = await client.delete("/api/reservations/wrong-secret-xyz")
    assert r.status_code == 404
