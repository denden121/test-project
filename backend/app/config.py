from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field(
        default="postgresql+asyncpg://localhost:5432/test_project",
        validation_alias="DATABASE_URL",
    )

    model_config = {"env_file": ".env"}

    @field_validator("database_url", mode="before")
    @classmethod
    def async_driver(cls, v: str) -> str:
        if v and v.startswith("postgresql://") and "asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v


settings = Settings()
