from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field(
        default="postgresql+asyncpg://localhost:5432/test_project",
        validation_alias="DATABASE_URL",
    )

    model_config = {"env_file": ".env"}


settings = Settings()
