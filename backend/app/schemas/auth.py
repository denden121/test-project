import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

    model_config = {"json_schema_extra": {"examples": [{"email": "user@example.com", "password": "secret123"}]}}

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime
    avatar_url: str | None = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Обновление профиля (аватар и т.д.)."""
    avatar_url: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class GoogleTokenRequest(BaseModel):
    """Тело запроса для входа через Google (обмен code на JWT)."""
    code: str = Field(description="Authorization code из redirect от Google")
    redirect_uri: str = Field(description="Тот же redirect_uri, что использовался при переходе в Google")


class ForgotPasswordRequest(BaseModel):
    """Запрос ссылки для сброса пароля."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Сброс пароля по токену из письма."""
    token: str = Field(description="Токен из ссылки в письме")
    new_password: str = Field(min_length=8)

    model_config = {"json_schema_extra": {"examples": [{"token": "...", "new_password": "newsecret123"}]}}

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v
