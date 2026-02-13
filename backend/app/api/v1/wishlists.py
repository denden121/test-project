from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_current_user_optional
from app.db.session import get_db
from app.models import Contribution, Reservation, User, Wishlist, WishlistItem
from app.schemas import (
    ContributionCreate,
    ContributionCreatedResponse,
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
    WishlistUpdate,
)
from app.services.websocket import ws_manager
from app.services.wishlist import (
    _total_contributed,
    broadcast_wishlist_update,
    get_wishlist_public_dict,
    item_to_response,
)

router = APIRouter()


# --- Создание списка (требуется авторизация) ---
@router.post("", response_model=WishlistManageResponse)
async def create_wishlist(
    data: WishlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Создать список желаний. Если авторизован — привязывается к пользователю."""
    wishlist = Wishlist(
        title=data.title,
        occasion=data.occasion,
        event_date=data.event_date,
        currency=(data.currency or "RUB").upper()[:3],
        user_id=current_user.id if current_user else None,
    )
    db.add(wishlist)
    await db.flush()
    await db.refresh(wishlist)
    return wishlist


# --- Мои вишлисты (по токену, требует авторизации) ---
@router.get("/mine", response_model=list[WishlistManageDetailResponse])
async def get_my_wishlists(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список вишлистов текущего пользователя. Доступно с любого устройства."""
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.user_id == current_user.id)
        .options(
            selectinload(Wishlist.items).selectinload(WishlistItem.contributions),
            selectinload(Wishlist.items).selectinload(WishlistItem.reservation),
        )
    )
    wishlists = result.scalars().all()
    return [
        WishlistManageDetailResponse(
            id=w.id,
            title=w.title,
            occasion=w.occasion,
            event_date=w.event_date,
            currency=getattr(w, "currency", None) or "RUB",
            slug=w.slug,
            creator_secret=w.creator_secret,
            created_at=w.created_at,
            items=[item_to_response(i) for i in w.items],
        )
        for w in wishlists
    ]


# --- WebSocket для реалтайм-обновлений ---
@router.websocket("/ws/{slug}")
async def wishlist_websocket(websocket: WebSocket, slug: str):
    """Подписка на обновления вишлиста по slug (резервации, вклады)."""
    await ws_manager.connect(websocket, slug)
    try:
        while True:
            await websocket.receive_text()  # держим соединение
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(websocket, slug)


# --- Публичный просмотр (для друзей по ссылке) ---
@router.get("/s/{slug}", response_model=WishlistPublicResponse)
async def get_wishlist_public(slug: str, db: AsyncSession = Depends(get_db)):
    """Публичный вид списка по slug. Видят друзья — могут резервировать подарки."""
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
        raise HTTPException(status_code=404, detail="Список не найден")
    return WishlistPublicResponse(
        id=wishlist.id,
        title=wishlist.title,
        occasion=wishlist.occasion,
        event_date=wishlist.event_date,
        currency=getattr(wishlist, "currency", None) or "RUB",
        slug=wishlist.slug,
        items=[item_to_response(i) for i in wishlist.items],
    )


# --- Управление (для создателя по creator_secret) ---
async def get_wishlist_by_secret(creator_secret: str, db: AsyncSession) -> Wishlist:
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.creator_secret == creator_secret)
        .options(
            selectinload(Wishlist.items).selectinload(WishlistItem.contributions),
            selectinload(Wishlist.items).selectinload(WishlistItem.reservation),
        )
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
        occasion=wishlist.occasion,
        event_date=wishlist.event_date,
        currency=getattr(wishlist, "currency", None) or "RUB",
        slug=wishlist.slug,
        creator_secret=wishlist.creator_secret,
        created_at=wishlist.created_at,
        items=[item_to_response(i) for i in wishlist.items],
    )


@router.patch("/m/{creator_secret}", response_model=WishlistManageResponse)
async def update_wishlist(
    creator_secret: str, data: WishlistUpdate, db: AsyncSession = Depends(get_db)
):
    """Обновить название, повод, дату и валюту списка."""
    wishlist = await get_wishlist_by_secret(creator_secret, db)
    update_data = data.model_dump(exclude_unset=True)
    if "currency" in update_data and update_data["currency"]:
        update_data["currency"] = str(update_data["currency"]).upper()[:3]
    for k, v in update_data.items():
        setattr(wishlist, k, v)
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
        min_contribution=data.min_contribution,
        image_url=data.image_url,
        sort_order=sort_order,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    # Перезагружаем с relationships — иначе lazy load падает в async
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.id == item.id)
        .options(
            selectinload(WishlistItem.reservation),
            selectinload(WishlistItem.contributions),
        )
    )
    item = result.scalar_one()
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
    # Перезагружаем с relationships — иначе lazy load падает в async
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.id == item.id)
        .options(
            selectinload(WishlistItem.reservation),
            selectinload(WishlistItem.contributions),
        )
    )
    item = result.scalar_one()
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
        .options(
            selectinload(Wishlist.items).selectinload(WishlistItem.contributions),
            selectinload(Wishlist.items).selectinload(WishlistItem.reservation),
        )
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

    data = await get_wishlist_public_dict(slug, db)
    if data:
        await ws_manager.broadcast_wishlist(slug, data)

    return ReservationCreatedResponse(reserver_secret=reservation.reserver_secret)


# --- Скинуться (публично по slug) ---
@router.post(
    "/s/{slug}/items/{item_id}/contribute",
    response_model=ContributionCreatedResponse,
)
async def contribute_item(
    slug: str,
    item_id: int,
    data: ContributionCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Добавить вклад в подарок. Владелец видит только общую сумму по товару, не кто сколько скинул.
    """
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
        raise HTTPException(status_code=404, detail="Список не найден")

    item = next((i for i in wishlist.items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Товар не найден")
    if item.reservation:
        raise HTTPException(status_code=400, detail="Подарок уже зарезервирован целиком")
    if item.price is None or item.price <= 0:
        raise HTTPException(status_code=400, detail="У товара не указана цена для сбора")

    total = _total_contributed(item)
    if total + data.amount > item.price:
        raise HTTPException(
            status_code=400,
            detail=f"Сумма вкладов не может превышать цену товара ({item.price}). Собрано: {total}, осталось: {item.price - total}",
        )
    min_contrib = getattr(item, "min_contribution", None)
    if min_contrib is not None and min_contrib > 0 and data.amount < min_contrib:
        raise HTTPException(
            status_code=400,
            detail=f"Минимальный вклад для этого товара: {min_contrib}",
        )

    contribution = Contribution(
        wishlist_item_id=item.id,
        contributor_name=data.contributor_name,
        amount=data.amount,
    )
    db.add(contribution)
    await db.flush()
    await db.refresh(contribution)

    wishlist_data = await get_wishlist_public_dict(slug, db)
    if wishlist_data:
        await ws_manager.broadcast_wishlist(slug, wishlist_data)

    return ContributionCreatedResponse(contributor_secret=contribution.contributor_secret)
