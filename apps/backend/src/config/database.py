from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from src.config.settings import settings
from src.config.database_url import database_options

database_url, connection_args = database_options(settings.DATABASE_URL)


engine = create_async_engine(
    database_url,
    echo=False,
    pool_pre_ping=True,
    connect_args=connection_args,
)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db_optional():
    """Yield a DB session if available, otherwise yield None (never hang)."""
    import asyncio
    try:
        session = AsyncSessionLocal()
        # Force a lightweight connection check with a tight timeout
        try:
            await asyncio.wait_for(session.connection(), timeout=3)
        except Exception:
            # DB not available — close session and yield None
            try:
                await session.close()
            except Exception:
                pass
            yield None
            return
        try:
            yield session
        except Exception:
            await session.rollback()
        finally:
            await session.close()
    except Exception:
        yield None


