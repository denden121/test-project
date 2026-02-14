import os
import secrets
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.db.session import get_db
from app.models import User
from app.schemas import (
    ForgotPasswordRequest,
    GoogleTokenRequest,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.services.email import send_password_reset_email

router = APIRouter()


@router.post("/register", response_model=Token)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    access_token = create_access_token(user.id)
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=Token)
async def login(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account uses Google sign-in. Use «Login with Google».",
        )
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    access_token = create_access_token(user.id)
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/google", response_model=Token)
async def login_google(
    data: GoogleTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured",
        )
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": data.code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": data.redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            err_body = token_res.text
            try:
                err_json = token_res.json()
                msg = err_json.get("error_description") or err_json.get("error") or err_body
            except Exception:
                msg = err_body or "Invalid or expired Google authorization code"
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=msg,
            )
        token_json = token_res.json()
        access_token_google = token_json.get("access_token")
        if not access_token_google:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google did not return an access token",
            )
        userinfo_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token_google}"},
        )
    if userinfo_res.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to fetch Google user info",
        )
    userinfo = userinfo_res.json()
    email = userinfo.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account has no email",
        )
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        try:
            user = User(email=email, hashed_password=None)
            db.add(user)
            await db.flush()
            await db.refresh(user)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "Database: users.hashed_password must allow NULL for Google sign-in. "
                    "Run: ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;"
                ),
            )
    access_token = create_access_token(user.id)
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Обновить профиль (фото и т.д.)."""
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url if data.avatar_url.strip() else None
    await db.flush()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
AVATAR_MAX_BYTES = 2 * 1024 * 1024  # 2 MB


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Загрузить фото профиля (JPEG, PNG или WebP, до 2 МБ)."""
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Разрешены только JPEG, PNG и WebP",
        )
    ext = "jpg" if file.content_type == "image/jpeg" else file.content_type.split("/")[-1]
    content = await file.read()
    if len(content) > AVATAR_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Файл не должен быть больше 2 МБ",
        )
    upload_dir = os.path.join(settings.upload_dir, "avatars")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{current_user.id}.{ext}"
    path = os.path.join(upload_dir, filename)
    with open(path, "wb") as f:
        f.write(content)
    base = str(request.base_url).rstrip("/")
    current_user.avatar_url = f"{base}/api/uploads/avatars/{filename}"
    await db.flush()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


RESET_TOKEN_EXPIRE = timedelta(hours=1)


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Запросить сброс пароля. Если email зарегистрирован и не только OAuth —
    выставляем токен и при настроенном RESEND_API_KEY отправляем письмо со ссылкой.
    Всегда возвращаем один и тот же ответ (не раскрываем, есть ли такой email).
    """
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if user and user.hashed_password is not None:
        user.password_reset_token = secrets.token_urlsafe(32)
        # Naive UTC: column is TIMESTAMP WITHOUT TIME ZONE, asyncpg rejects timezone-aware
        user.password_reset_expires = (datetime.now(timezone.utc) + RESET_TOKEN_EXPIRE).replace(tzinfo=None)
        await db.flush()
        base = settings.frontend_url.rstrip("/")
        reset_link = f"{base}/reset-password?token={user.password_reset_token}"
        await send_password_reset_email(user.email, reset_link)
    return {"detail": "Если такой email зарегистрирован, вы получите письмо со ссылкой для сброса пароля."}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Сбросить пароль по токену из ссылки в письме. Токен действителен 1 час.
    """
    now_utc_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    result = await db.execute(
        select(User).where(
            User.password_reset_token == data.token,
            User.password_reset_expires > now_utc_naive,
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ссылка недействительна или истекла. Запросите сброс пароля снова.",
        )
    user.hashed_password = get_password_hash(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    await db.flush()
    return {"detail": "Пароль изменён. Теперь можно войти с новым паролем."}
