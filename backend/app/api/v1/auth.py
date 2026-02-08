import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
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
from app.schemas import GoogleTokenRequest, Token, UserCreate, UserResponse

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
        user = User(email=email, hashed_password=None)
        db.add(user)
        await db.flush()
        await db.refresh(user)
    access_token = create_access_token(user.id)
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
