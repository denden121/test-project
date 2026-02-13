from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base

# sync URL for create_async_engine expects postgresql+asyncpg://
engine = create_async_engine(
    settings.database_url,
    echo=False,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:  # rollback on any DB/commit error
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Widen price/amount columns for existing DBs (Numeric(10,2) -> Numeric(18,2))
        for stmt in (
            "ALTER TABLE wishlist_items ALTER COLUMN price TYPE NUMERIC(18, 2)",
            "ALTER TABLE contributions ALTER COLUMN amount TYPE NUMERIC(18, 2)",
            "ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'RUB'",
            "ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS min_contribution NUMERIC(18, 2) NULL",
            "ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS user_id INTEGER NULL",
            "ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS fk_wishlists_user_id",
            "ALTER TABLE wishlists ADD CONSTRAINT fk_wishlists_user_id "
            "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL",
            "CREATE INDEX IF NOT EXISTS ix_wishlists_user_id ON wishlists(user_id)",
        ):
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass  # column/constraint may already exist or table missing
