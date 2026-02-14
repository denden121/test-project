import os
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

_DEFAULT_SECRET = "change-me-in-production-use-env-SECRET_KEY"


class Settings(BaseSettings):
    database_url: str = Field(
        default="postgresql+asyncpg://localhost:5432/test_project",
        validation_alias="DATABASE_URL",
    )
    secret_key: str = Field(
        default=_DEFAULT_SECRET,
        validation_alias="SECRET_KEY",
    )
    algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=60 * 24 * 7,
        validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES",
    )
    # Google OAuth (optional; if set, "Login with Google" is enabled)
    google_client_id: str | None = Field(default=None, validation_alias="GOOGLE_CLIENT_ID")
    google_client_secret: str | None = Field(default=None, validation_alias="GOOGLE_CLIENT_SECRET")
    # Папка для загруженных файлов (аватары и т.д.)
    upload_dir: str = Field(default="uploads", validation_alias="UPLOAD_DIR")
    # Восстановление пароля: базовый URL фронта для ссылки в письме
    frontend_url: str = Field(default="http://localhost:5173", validation_alias="FRONTEND_URL")
    # Resend API key — если задан, при «забыли пароль» отправляется письмо
    resend_api_key: str | None = Field(default=None, validation_alias="RESEND_API_KEY")
    resend_from_email: str = Field(default="onboarding@resend.dev", validation_alias="RESEND_FROM_EMAIL")

    model_config = {"env_file": ".env"}

    @field_validator("database_url", mode="before")
    @classmethod
    def async_driver(cls, v: str) -> str:
        if v and v.startswith("postgresql://") and "asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("secret_key")
    @classmethod
    def secret_not_default_in_production(cls, v: str) -> str:
        if os.environ.get("ENV") == "production" and v == _DEFAULT_SECRET:
            raise ValueError("Set SECRET_KEY in production")
        return v


settings = Settings()
