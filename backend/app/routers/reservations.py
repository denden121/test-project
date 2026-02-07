from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Reservation, WishlistItem
from app.routers.wishlists import broadcast_wishlist_update
from app.schemas import ReservationResponse

router = APIRouter()


@router.get("/{reserver_secret}", response_model=ReservationResponse)
async def get_my_reservation(
    reserver_secret: str, db: AsyncSession = Depends(get_db)
):
    """Посмотреть свою резервацию по reserver_secret (из ссылки после резервирования)."""
    result = await db.execute(
        select(Reservation)
        .where(Reservation.reserver_secret == reserver_secret)
        .options(selectinload(Reservation.item))
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Резервация не найдена")

    return ReservationResponse(
        id=reservation.id,
        wishlist_item_id=reservation.wishlist_item_id,
        reserver_name=reservation.reserver_name,
        reserved_at=reservation.reserved_at,
        item_title=reservation.item.title if reservation.item else None,
    )


@router.delete("/{reserver_secret}", status_code=204)
async def cancel_reservation(
    reserver_secret: str, db: AsyncSession = Depends(get_db)
):
    """Отменить свою резервацию."""
    result = await db.execute(
        select(Reservation)
        .where(Reservation.reserver_secret == reserver_secret)
        .options(selectinload(Reservation.item).selectinload(WishlistItem.wishlist))
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Резервация не найдена")

    slug = reservation.item.wishlist.slug
    await db.delete(reservation)
    await db.flush()
    await broadcast_wishlist_update(slug, db)
    return None
