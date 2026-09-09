from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from src.config.settings import settings
from sqlalchemy.engine import make_url
import ssl

database_url = make_url(settings.DATABASE_URL)
connection_args = {"timeout": 15}
if database_url.drivername in ("postgres", "postgresql", "postgresql+asyncpg"):
    query = dict(database_url.query)
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    database_url = database_url.set(drivername="postgresql+asyncpg", query=query)
    if sslmode and sslmode != "disable":
        connection_args["ssl"] = ssl.create_default_context()


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


