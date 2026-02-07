from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field(
        default="postgresql+asyncpg://localhost:5432/test_project",
        validation_alias="DATABASE_URL",
    )
    secret_key: str = Field(
        default="change-me-in-production-use-env-SECRET_KEY",
        validation_alias="SECRET_KEY",
    )
    algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=60 * 24 * 7,
        validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES",
    )

    model_config = {"env_file": ".env"}

    @field_validator("database_url", mode="before")
    @classmethod
    def async_driver(cls, v: str) -> str:
        if v and v.startswith("postgresql://") and "asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v


settings = Settings()
