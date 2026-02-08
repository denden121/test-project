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

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class GoogleTokenRequest(BaseModel):
    """Тело запроса для входа через Google (обмен code на JWT)."""
    code: str = Field(description="Authorization code из redirect от Google")
    redirect_uri: str = Field(description="Тот же redirect_uri, что использовался при переходе в Google")
