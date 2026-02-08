from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Wishlist, WishlistItem
from app.schemas import WishlistItemResponse, WishlistPublicResponse
from app.services.websocket import ws_manager


def _total_contributed(item: WishlistItem) -> Decimal:
    if not item.contributions:
        return Decimal("0")
    return sum((c.amount for c in item.contributions), Decimal("0"))


def item_to_response(item: WishlistItem) -> WishlistItemResponse:
    """Преобразует WishlistItem в response; владелец не видит кто скинулся."""
    return WishlistItemResponse(
        id=item.id,
        wishlist_id=item.wishlist_id,
        title=item.title,
        link=item.link,
        price=item.price,
        image_url=item.image_url,
        sort_order=item.sort_order,
        is_reserved=item.reservation is not None,
        total_contributed=_total_contributed(item),
        created_at=item.created_at,
    )


async def get_wishlist_public_dict(slug: str, db: AsyncSession) -> dict | None:
    """Загружает вишлист и возвращает данные для публичного ответа (для broadcast)."""
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.slug == slug)
        .options(
            selectinload(Wishlist.items).selectinload(WishlistItem.contributions),
            selectinload(Wishlist.items).selectinload(WishlistItem.reservation),
        )
    )
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        return None
    resp = WishlistPublicResponse(
        id=wishlist.id,
        title=wishlist.title,
        slug=wishlist.slug,
        items=[item_to_response(i) for i in wishlist.items],
    )
    return resp.model_dump(mode="json")


async def broadcast_wishlist_update(slug: str, db: AsyncSession) -> None:
    """Broadcast обновлённого вишлиста всем подписчикам по slug."""
    data = await get_wishlist_public_dict(slug, db)
    if data:
        await ws_manager.broadcast_wishlist(slug, data)
