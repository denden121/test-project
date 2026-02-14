from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.security import get_password_hash
from app.models import User


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


# --- Восстановление пароля (forgot-password / reset-password) ---


@pytest.mark.asyncio
async def test_forgot_password_returns_same_message_always(client: AsyncClient):
    """POST /forgot-password всегда 200 и один и тот же текст (не раскрываем, есть ли email)."""
    r1 = await client.post(
        "/api/auth/forgot-password",
        json={"email": "nonexistent@example.com"},
    )
    assert r1.status_code == 200
    assert "detail" in r1.json()

    await client.post(
        "/api/auth/register",
        json={"email": "real@example.com", "password": "secret123"},
    )
    r2 = await client.post(
        "/api/auth/forgot-password",
        json={"email": "real@example.com"},
    )
    assert r2.status_code == 200
    assert r1.json()["detail"] == r2.json()["detail"]


@pytest.mark.asyncio
async def test_forgot_password_sets_token_for_user_with_password(
    client: AsyncClient, db_session
):
    """Для пользователя с паролем forgot-password выставляет token и expires."""
    await client.post(
        "/api/auth/register",
        json={"email": "resetme@example.com", "password": "oldpass12"},
    )
    r = await client.post(
        "/api/auth/forgot-password",
        json={"email": "resetme@example.com"},
    )
    assert r.status_code == 200

    result = await db_session.execute(select(User).where(User.email == "resetme@example.com"))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.password_reset_token is not None
    assert len(user.password_reset_token) >= 32
    assert user.password_reset_expires is not None
    assert user.password_reset_expires > datetime.now(timezone.utc).replace(tzinfo=None)


@pytest.mark.asyncio
async def test_forgot_password_oauth_user_no_token(client: AsyncClient, db_session):
    """Пользователь без пароля (только OAuth) — не выставляем token, но ответ 200."""
    db_session.add(User(email="oauth@example.com", hashed_password=None))
    await db_session.commit()

    r = await client.post(
        "/api/auth/forgot-password",
        json={"email": "oauth@example.com"},
    )
    assert r.status_code == 200

    result = await db_session.execute(select(User).where(User.email == "oauth@example.com"))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.password_reset_token is None
    assert user.password_reset_expires is None


@pytest.mark.asyncio
async def test_reset_password_success(client: AsyncClient, db_session):
    """Сброс по валидному токену: пароль меняется, токен обнуляется, вход новым паролем работает."""
    await client.post(
        "/api/auth/register",
        json={"email": "resetflow@example.com", "password": "oldpass12"},
    )
    await client.post(
        "/api/auth/forgot-password",
        json={"email": "resetflow@example.com"},
    )

    result = await db_session.execute(
        select(User).where(User.email == "resetflow@example.com")
    )
    user = result.scalar_one_or_none()
    assert user is not None
    token = user.password_reset_token

    r = await client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "newpass12"},
    )
    assert r.status_code == 200
    assert "Пароль изменён" in r.json().get("detail", "")

    # Вход старым паролем — 401
    r_login_old = await client.post(
        "/api/auth/login",
        json={"email": "resetflow@example.com", "password": "oldpass12"},
    )
    assert r_login_old.status_code == 401

    # Вход новым паролем — 200
    r_login_new = await client.post(
        "/api/auth/login",
        json={"email": "resetflow@example.com", "password": "newpass12"},
    )
    assert r_login_new.status_code == 200
    assert "access_token" in r_login_new.json()

    # Токен сброса обнулён
    db_session.expire_all()  # сброс identity map, чтобы подтянуть данные после commit приложения
    result = await db_session.execute(
        select(User).where(User.email == "resetflow@example.com")
    )
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.password_reset_token is None
    assert user.password_reset_expires is None


@pytest.mark.asyncio
async def test_reset_password_validation(client: AsyncClient):
    """Некорректный new_password — 422 (схема)."""
    r = await client.post(
        "/api/auth/reset-password",
        json={"token": "any-token", "new_password": "short"},  # < 8 символов
    )
    assert r.status_code == 422

    r2 = await client.post(
        "/api/auth/reset-password",
        json={"token": "any-token", "new_password": "12345678"},  # без буквы
    )
    assert r2.status_code == 422


@pytest.mark.asyncio
async def test_reset_password_invalid_token(client: AsyncClient):
    """Неверный токен — 400."""
    r = await client.post(
        "/api/auth/reset-password",
        json={"token": "invalid-token-123", "new_password": "newpass12"},
    )
    assert r.status_code == 400
    assert "detail" in r.json()
    assert "недействительна" in r.json()["detail"] or "истекла" in r.json()["detail"]


@pytest.mark.asyncio
async def test_reset_password_expired_token(client: AsyncClient, db_session):
    """Истёкший токен — 400."""
    db_session.add(
        User(
            email="expired@example.com",
            hashed_password=get_password_hash("oldpass12"),
            password_reset_token="expired-token-xyz",
            password_reset_expires=datetime(2000, 1, 1),  # naive UTC for TIMESTAMP WITHOUT TIME ZONE
        )
    )
    await db_session.commit()

    r = await client.post(
        "/api/auth/reset-password",
        json={"token": "expired-token-xyz", "new_password": "newpass12"},
    )
    assert r.status_code == 400
    assert "detail" in r.json()
