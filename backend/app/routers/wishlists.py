from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Wishlist, WishlistItem, Reservation
from app.schemas import (
    ReservationCreate,
    ReservationCreatedResponse,
    WishlistCreate,
    WishlistItemCreate,
    WishlistItemResponse,
    WishlistItemUpdate,
    WishlistManageDetailResponse,
    WishlistManageResponse,
    WishlistPublicResponse,
    WishlistResponse,
)

router = APIRouter()


def item_to_response(item: WishlistItem) -> WishlistItemResponse:
    """Преобразует WishlistItem в response с is_reserved (без имени резервировавшего)."""
    return WishlistItemResponse(
        id=item.id,
        wishlist_id=item.wishlist_id,
        title=item.title,
        link=item.link,
        price=item.price,
        image_url=item.image_url,
        sort_order=item.sort_order,
        is_reserved=item.reservation is not None,
        created_at=item.created_at,
    )


# --- Создание списка ---
@router.post("", response_model=WishlistManageResponse)
async def create_wishlist(data: WishlistCreate, db: AsyncSession = Depends(get_db)):
    """Создать список желаний. Возвращает slug (для шаринга) и creator_secret (сохраните!)."""
    wishlist = Wishlist(title=data.title)
    db.add(wishlist)
    await db.flush()
    await db.refresh(wishlist)
    return wishlist


# --- Публичный просмотр (для друзей по ссылке) ---
@router.get("/s/{slug}", response_model=WishlistPublicResponse)
async def get_wishlist_public(slug: str, db: AsyncSession = Depends(get_db)):
    """Публичный вид списка по slug. Видят друзья — могут резервировать подарки."""
    result = await db.execute(
        select(Wishlist).where(Wishlist.slug == slug).options(selectinload(Wishlist.items))
    )
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Список не найден")
    return WishlistPublicResponse(
        id=wishlist.id,
        title=wishlist.title,
        slug=wishlist.slug,
        items=[item_to_response(i) for i in wishlist.items],
    )


# --- Управление (для создателя по creator_secret) ---
async def get_wishlist_by_secret(creator_secret: str, db: AsyncSession) -> Wishlist:
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.creator_secret == creator_secret)
        .options(selectinload(Wishlist.items))
    )
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Список не найден или неверный ключ")
    return wishlist


@router.get("/m/{creator_secret}", response_model=WishlistManageDetailResponse)
async def get_wishlist_manage(creator_secret: str, db: AsyncSession = Depends(get_db)):
    """Управление списком по creator_secret. Создатель видит items с is_reserved (без имён)."""
    wishlist = await get_wishlist_by_secret(creator_secret, db)
    return WishlistManageDetailResponse(
        id=wishlist.id,
        title=wishlist.title,
        slug=wishlist.slug,
        creator_secret=wishlist.creator_secret,
        created_at=wishlist.created_at,
        items=[item_to_response(i) for i in wishlist.items],
    )


@router.patch("/m/{creator_secret}", response_model=WishlistManageResponse)
async def update_wishlist(
    creator_secret: str, data: WishlistCreate, db: AsyncSession = Depends(get_db)
):
    """Обновить название списка."""
    wishlist = await get_wishlist_by_secret(creator_secret, db)
    wishlist.title = data.title
    await db.flush()
    await db.refresh(wishlist)
    return wishlist


@router.delete("/m/{creator_secret}", status_code=204)
async def delete_wishlist(creator_secret: str, db: AsyncSession = Depends(get_db)):
    """Удалить список и все его товары и резервации."""
    wishlist = await get_wishlist_by_secret(creator_secret, db)
    await db.delete(wishlist)
    return None


# --- Товары (только для создателя) ---
@router.post("/m/{creator_secret}/items", response_model=WishlistItemResponse)
async def add_item(
    creator_secret: str,
    data: WishlistItemCreate,
    db: AsyncSession = Depends(get_db),
):
    """Добавить товар в список."""
    wishlist = await get_wishlist_by_secret(creator_secret, db)
    max_order = (
        await db.execute(
            select(WishlistItem.sort_order)
            .where(WishlistItem.wishlist_id == wishlist.id)
            .order_by(WishlistItem.sort_order.desc())
            .limit(1)
        )
    )
    last = max_order.scalar_one_or_none()
    sort_order = (last or 0) + 1

    item = WishlistItem(
        wishlist_id=wishlist.id,
        title=data.title,
        link=data.link,
        price=data.price,
        image_url=data.image_url,
        sort_order=sort_order,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item_to_response(item)


@router.patch("/m/{creator_secret}/items/{item_id}", response_model=WishlistItemResponse)
async def update_item(
    creator_secret: str,
    item_id: int,
    data: WishlistItemUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Обновить товар."""
    wishlist = await get_wishlist_by_secret(creator_secret, db)
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.wishlist_id == wishlist.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Товар не найден")

    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(item, k, v)
    await db.flush()
    await db.refresh(item)
    return item_to_response(item)


@router.delete("/m/{creator_secret}/items/{item_id}", status_code=204)
async def delete_item(
    creator_secret: str, item_id: int, db: AsyncSession = Depends(get_db)
):
    """Удалить товар."""
    wishlist = await get_wishlist_by_secret(creator_secret, db)
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.wishlist_id == wishlist.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Товар не найден")
    await db.delete(item)
    return None


# --- Резервация (публично по slug) ---
@router.post(
    "/s/{slug}/items/{item_id}/reserve",
    response_model=ReservationCreatedResponse,
)
async def reserve_item(
    slug: str,
    item_id: int,
    data: ReservationCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Зарезервировать подарок. Доступно по публичной ссылке списка.
    Сохраните reserver_secret — по нему можно посмотреть и отменить резервацию.
    """
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.slug == slug)
        .options(selectinload(Wishlist.items))
    )
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Список не найден")

    item = next((i for i in wishlist.items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Товар не найден")
    if item.reservation:
        raise HTTPException(status_code=409, detail="Подарок уже зарезервирован")

    reservation = Reservation(
        wishlist_item_id=item.id,
        reserver_name=data.reserver_name,
    )
    db.add(reservation)
    await db.flush()
    await db.refresh(reservation)

    return ReservationCreatedResponse(reserver_secret=reservation.reserver_secret)
