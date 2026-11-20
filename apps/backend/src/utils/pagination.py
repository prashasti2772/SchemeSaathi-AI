from typing import Generic, TypeVar
from pydantic import BaseModel, Field
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class PageParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PageResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


async def paginate(db: AsyncSession, query: Select, params: PageParams) -> tuple[list, int]:
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    paged_query = query.offset(params.offset).limit(params.page_size)
    rows = (await db.execute(paged_query)).scalars().all()
    return list(rows), total
