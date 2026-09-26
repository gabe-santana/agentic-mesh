from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    # MVP: create tables directly from models instead of Alembic migrations.
    import app.models  # noqa: F401  (registers all models on Base.metadata)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # create_all() only creates missing tables, not missing columns on
        # existing ones — patch known additive columns for already-running DBs.
        await conn.execute(
            text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS trace_json TEXT")
        )
