import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    """Регистрация пользователя."""
    r = await client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "secret123"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Повторная регистрация с тем же email — 400."""
    payload = {"email": "dup@example.com", "password": "secret123"}
    await client.post("/api/auth/register", json=payload)
    r = await client.post("/api/auth/register", json=payload)
    assert r.status_code == 400
    assert "already registered" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    """Логин возвращает токен."""
    await client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "password": "mypass12"},
    )
    r = await client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "mypass12"},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Логин с неверным паролем — 401."""
    await client.post(
        "/api/auth/register",
        json={"email": "login2@example.com", "password": "correct1"},
    )
    r = await client.post(
        "/api/auth/login",
        json={"email": "login2@example.com", "password": "wrongpass1"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient):
    """GET /me с токеном возвращает пользователя."""
    reg_r = await client.post(
        "/api/auth/register",
        json={"email": "me@example.com", "password": "secret12"},
    )
    token = reg_r.json()["access_token"]

    r = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["email"] == "me@example.com"


@pytest.mark.asyncio
async def test_me_unauthorized(client: AsyncClient):
    """GET /me без токена — 401."""
    r = await client.get("/api/auth/me")
    assert r.status_code == 401
