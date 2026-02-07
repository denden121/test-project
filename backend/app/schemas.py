from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr


# --- Auth / User ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Wishlist ---
class WishlistCreate(BaseModel):
    title: str


class WishlistResponse(BaseModel):
    id: int
    title: str
    slug: str
    created_at: datetime

    class Config:
        from_attributes = True


class WishlistManageResponse(WishlistResponse):
    """Ответ для создателя — включает creator_secret для управления."""
    creator_secret: str


# --- WishlistItem ---
class WishlistItemCreate(BaseModel):
    title: str
    link: str | None = None
    price: Decimal | None = None
    image_url: str | None = None


class WishlistItemUpdate(BaseModel):
    title: str | None = None
    link: str | None = None
    price: Decimal | None = None
    image_url: str | None = None


class WishlistItemResponse(BaseModel):
    id: int
    wishlist_id: int
    title: str
    link: str | None
    price: Decimal | None
    image_url: str | None
    sort_order: int
    is_reserved: bool  # Создатель видит только флаг, без имени резервировавшего
    created_at: datetime

    class Config:
        from_attributes = True


# --- Reservation ---
class ReservationCreate(BaseModel):
    reserver_name: str  # "Маша" — как представиться (видно только резервировавшему)


class ReservationResponse(BaseModel):
    """Для того, кто зарезервировал — видит свои резервации по reserver_secret."""
    id: int
    wishlist_item_id: int
    reserver_name: str
    reserved_at: datetime
    # item details для удобства
    item_title: str | None = None

    class Config:
        from_attributes = True


# --- Public view (для друзей по ссылке) ---
class WishlistPublicResponse(BaseModel):
    """Публичный вид списка — по slug, без creator_secret."""
    id: int
    title: str
    items: list[WishlistItemResponse]


# --- Legacy Item (для совместимости) ---
class ItemCreate(BaseModel):
    title: str
    description: str | None = None


class ItemResponse(BaseModel):
    id: int
    title: str
    description: str | None

    class Config:
        from_attributes = True
