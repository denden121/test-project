import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_wishlist(client: AsyncClient):
    """Создание списка возвращает slug и creator_secret."""
    r = await client.post("/api/wishlists", json={"title": "День рождения"})
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "День рождения"
    assert "slug" in data
    assert "creator_secret" in data
    assert len(data["slug"]) > 0
    assert len(data["creator_secret"]) > 0


@pytest.mark.asyncio
async def test_get_wishlist_public_not_found(client: AsyncClient):
    """Публичный просмотр несуществующего slug — 404."""
    r = await client.get("/api/wishlists/s/nonexistent-slug-123")
    assert r.status_code == 404
    assert "Список не найден" in r.json()["detail"]


@pytest.mark.asyncio
async def test_get_wishlist_public(client: AsyncClient):
    """Публичный просмотр по slug показывает список и товары."""
    create_r = await client.post("/api/wishlists", json={"title": "Новый год"})
    slug = create_r.json()["slug"]

    r = await client.get(f"/api/wishlists/s/{slug}")
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Новый год"
    assert data["slug"] == slug
    assert "creator_secret" not in data
    assert data["items"] == []


@pytest.mark.asyncio
async def test_get_wishlist_manage_not_found(client: AsyncClient):
    """Управление с неверным creator_secret — 404."""
    r = await client.get("/api/wishlists/m/wrong-secret-123")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_wishlist_manage(client: AsyncClient):
    """Управление по creator_secret показывает creator_secret и items."""
    create_r = await client.post("/api/wishlists", json={"title": "Свадьба"})
    creator_secret = create_r.json()["creator_secret"]

    r = await client.get(f"/api/wishlists/m/{creator_secret}")
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Свадьба"
    assert data["creator_secret"] == creator_secret
    assert "items" in data


@pytest.mark.asyncio
async def test_update_wishlist(client: AsyncClient):
    """Обновление названия списка."""
    create_r = await client.post("/api/wishlists", json={"title": "Было"})
    creator_secret = create_r.json()["creator_secret"]

    r = await client.patch(
        f"/api/wishlists/m/{creator_secret}",
        json={"title": "Стало"},
    )
    assert r.status_code == 200
    assert r.json()["title"] == "Стало"


@pytest.mark.asyncio
async def test_add_item(client: AsyncClient):
    """Добавление товара в список."""
    create_r = await client.post("/api/wishlists", json={"title": "Список"})
    creator_secret = create_r.json()["creator_secret"]

    r = await client.post(
        f"/api/wishlists/m/{creator_secret}/items",
        json={
            "title": "Наушники",
            "link": "https://example.com/1",
            "price": 99.99,
            "image_url": "https://example.com/img.jpg",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Наушники"
    assert data["link"] == "https://example.com/1"
    assert float(data["price"]) == 99.99
    assert data["image_url"] == "https://example.com/img.jpg"
    assert data["is_reserved"] is False


@pytest.mark.asyncio
async def test_add_item_minimal(client: AsyncClient):
    """Добавление товара с минимальными полями (только title)."""
    create_r = await client.post("/api/wishlists", json={"title": "Список"})
    creator_secret = create_r.json()["creator_secret"]

    r = await client.post(
        f"/api/wishlists/m/{creator_secret}/items",
        json={"title": "Книга"},
    )
    assert r.status_code == 200
    assert r.json()["title"] == "Книга"
    assert r.json()["link"] is None


@pytest.mark.asyncio
async def test_update_item(client: AsyncClient):
    """Обновление товара."""
    create_r = await client.post("/api/wishlists", json={"title": "Список"})
    creator_secret = create_r.json()["creator_secret"]
    add_r = await client.post(
        f"/api/wishlists/m/{creator_secret}/items",
        json={"title": "Было", "price": 10},
    )
    item_id = add_r.json()["id"]

    r = await client.patch(
        f"/api/wishlists/m/{creator_secret}/items/{item_id}",
        json={"title": "Стало", "price": 20},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Стало"
    assert float(data["price"]) == 20


@pytest.mark.asyncio
async def test_update_item_not_found(client: AsyncClient):
    """Обновление несуществующего товара — 404."""
    create_r = await client.post("/api/wishlists", json={"title": "Список"})
    creator_secret = create_r.json()["creator_secret"]

    r = await client.patch(
        f"/api/wishlists/m/{creator_secret}/items/99999",
        json={"title": "Стало"},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_item(client: AsyncClient):
    """Удаление товара."""
    create_r = await client.post("/api/wishlists", json={"title": "Список"})
    creator_secret = create_r.json()["creator_secret"]
    add_r = await client.post(
        f"/api/wishlists/m/{creator_secret}/items",
        json={"title": "Удалю"},
    )
    item_id = add_r.json()["id"]

    r = await client.delete(f"/api/wishlists/m/{creator_secret}/items/{item_id}")
    assert r.status_code == 204

    # Список без этого товара
    manage_r = await client.get(f"/api/wishlists/m/{creator_secret}")
    ids = [i["id"] for i in manage_r.json()["items"]]
    assert item_id not in ids


@pytest.mark.asyncio
async def test_delete_wishlist(client: AsyncClient):
    """Удаление списка."""
    create_r = await client.post("/api/wishlists", json={"title": "Удалю"})
    creator_secret = create_r.json()["creator_secret"]
    slug = create_r.json()["slug"]

    r = await client.delete(f"/api/wishlists/m/{creator_secret}")
    assert r.status_code == 204

    r = await client.get(f"/api/wishlists/s/{slug}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_reserve_item(client: AsyncClient):
    """Резервация подарка возвращает reserver_secret."""
    create_r = await client.post("/api/wishlists", json={"title": "Список"})
    slug = create_r.json()["slug"]
    creator_secret = create_r.json()["creator_secret"]
    add_r = await client.post(
        f"/api/wishlists/m/{creator_secret}/items",
        json={"title": "Подарок"},
    )
    item_id = add_r.json()["id"]

    r = await client.post(
        f"/api/wishlists/s/{slug}/items/{item_id}/reserve",
        json={"reserver_name": "Маша"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "reserver_secret" in data
    assert len(data["reserver_secret"]) > 0


@pytest.mark.asyncio
async def test_reserve_item_already_reserved(client: AsyncClient):
    """Повторная резервация того же подарка — 409."""
    create_r = await client.post("/api/wishlists", json={"title": "Список"})
    slug = create_r.json()["slug"]
    creator_secret = create_r.json()["creator_secret"]
    add_r = await client.post(
        f"/api/wishlists/m/{creator_secret}/items",
        json={"title": "Подарок"},
    )
    item_id = add_r.json()["id"]

    await client.post(
        f"/api/wishlists/s/{slug}/items/{item_id}/reserve",
        json={"reserver_name": "Маша"},
    )
    r = await client.post(
        f"/api/wishlists/s/{slug}/items/{item_id}/reserve",
        json={"reserver_name": "Петя"},
    )
    assert r.status_code == 409
    assert "уже зарезервирован" in r.json()["detail"]


@pytest.mark.asyncio
async def test_creator_sees_is_reserved_without_name(client: AsyncClient):
    """Создатель видит is_reserved=true, но не имя резервировавшего."""
    create_r = await client.post("/api/wishlists", json={"title": "Список"})
    slug = create_r.json()["slug"]
    creator_secret = create_r.json()["creator_secret"]
    add_r = await client.post(
        f"/api/wishlists/m/{creator_secret}/items",
        json={"title": "Сюрприз"},
    )
    item_id = add_r.json()["id"]

    await client.post(
        f"/api/wishlists/s/{slug}/items/{item_id}/reserve",
        json={"reserver_name": "Маша"},
    )

    r = await client.get(f"/api/wishlists/m/{creator_secret}")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["is_reserved"] is True
    assert "reserver_name" not in items[0]
