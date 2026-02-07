from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Contribution
from app.schemas import ContributionResponse

router = APIRouter()


@router.get("/{contributor_secret}", response_model=ContributionResponse)
async def get_my_contribution(
    contributor_secret: str, db: AsyncSession = Depends(get_db)
):
    """Посмотреть свой вклад по contributor_secret (из ссылки после скиды)."""
    result = await db.execute(
        select(Contribution)
        .where(Contribution.contributor_secret == contributor_secret)
        .options(selectinload(Contribution.item))
    )
    contribution = result.scalar_one_or_none()
    if not contribution:
        raise HTTPException(status_code=404, detail="Вклад не найден")

    return ContributionResponse(
        id=contribution.id,
        wishlist_item_id=contribution.wishlist_item_id,
        contributor_name=contribution.contributor_name,
        amount=contribution.amount,
        contributed_at=contribution.contributed_at,
        item_title=contribution.item.title if contribution.item else None,
    )


@router.delete("/{contributor_secret}", status_code=204)
async def cancel_contribution(
    contributor_secret: str, db: AsyncSession = Depends(get_db)
):
    """Отменить свой вклад."""
    result = await db.execute(
        select(Contribution).where(Contribution.contributor_secret == contributor_secret)
    )
    contribution = result.scalar_one_or_none()
    if not contribution:
        raise HTTPException(status_code=404, detail="Вклад не найден")

    await db.delete(contribution)
    return None
