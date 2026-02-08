from datetime import datetime
from decimal import Decimal

import re
from pydantic import BaseModel, EmailStr, Field, field_validator


# --- Auth / User ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

    model_config = {"json_schema_extra": {"examples": [{"email": "user@example.com", "password": "secret123"}]}}

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v




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


class GoogleTokenRequest(BaseModel):
    """Тело запроса для входа через Google (обмен code на JWT)."""
    code: str = Field(description="Authorization code из redirect от Google")
    redirect_uri: str = Field(description="Тот же redirect_uri, что использовался при переходе в Google")


# --- Wishlist ---
class WishlistCreate(BaseModel):
    title: str = Field(description="Название повода", examples=["День рождения", "Новый год"])

    model_config = {"json_schema_extra": {"examples": [{"title": "День рождения"}]}}


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
    title: str = Field(description="Название товара")
    link: str | None = Field(None, description="Ссылка на товар")
    price: Decimal | None = Field(None, description="Цена")
    image_url: str | None = Field(None, description="URL картинки")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "Наушники Sony",
                    "link": "https://example.com/product/123",
                    "price": 99.99,
                    "image_url": "https://example.com/image.jpg",
                }
            ]
        }
    }


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
    is_reserved: bool
    total_contributed: Decimal = Decimal("0")  # Сумма вкладов; владелец не видит кто сколько
    created_at: datetime

    class Config:
        from_attributes = True


# --- Reservation ---
class ReservationCreate(BaseModel):
    reserver_name: str = Field(
        description="Ваше имя (видно только вам при просмотре резервации)",
        examples=["Маша"],
    )

    model_config = {"json_schema_extra": {"examples": [{"reserver_name": "Маша"}]}}


class ReservationResponse(BaseModel):
    """Для того, кто зарезервировал — видит свои резервации по reserver_secret."""
    id: int
    wishlist_item_id: int
    reserver_name: str
    reserved_at: datetime
    item_title: str | None = None

    class Config:
        from_attributes = True


class ReservationCreatedResponse(BaseModel):
    """Ответ после успешной резервации — сохраните reserver_secret для доступа."""
    reserver_secret: str
    message: str = "Подарок зарезервирован. Сохраните ссылку для управления резервацией."


# --- Contribution (скинуться) ---
class ContributionCreate(BaseModel):
    contributor_name: str = Field(description="Ваше имя (видно только вам)")
    amount: Decimal = Field(gt=0, description="Сумма вклада")

    model_config = {"json_schema_extra": {"examples": [{"contributor_name": "Маша", "amount": 50}]}}


class ContributionResponse(BaseModel):
    id: int
    wishlist_item_id: int
    contributor_name: str
    amount: Decimal
    contributed_at: datetime
    item_title: str | None = None

    class Config:
        from_attributes = True


class ContributionCreatedResponse(BaseModel):
    contributor_secret: str
    message: str = "Вклад добавлен. Сохраните ссылку для просмотра или отмены."


# --- Public view (для друзей по ссылке) ---
class WishlistPublicResponse(BaseModel):
    """Публичный вид списка — по slug, без creator_secret."""
    id: int
    title: str
    slug: str
    items: list[WishlistItemResponse]


class WishlistManageDetailResponse(WishlistManageResponse):
    """Полный вид для управления — создатель видит items с is_reserved (без имён)."""
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
