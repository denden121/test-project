from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Item
from app.schemas import ItemCreate, ItemResponse

router = APIRouter()


@router.get("", response_model=list[ItemResponse])
async def list_items(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item))
    return list(result.scalars().all())


@router.post("", response_model=ItemResponse)
async def create_item(item: ItemCreate, db: AsyncSession = Depends(get_db)):
    db_item = Item(title=item.title, description=item.description)
    db.add(db_item)
    await db.flush()
    await db.refresh(db_item)
    return db_item
