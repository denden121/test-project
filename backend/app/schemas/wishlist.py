from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


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


class WishlistPublicResponse(BaseModel):
    """Публичный вид списка — по slug, без creator_secret."""
    id: int
    title: str
    slug: str
    items: list[WishlistItemResponse]


class WishlistManageDetailResponse(WishlistManageResponse):
    """Полный вид для управления — создатель видит items с is_reserved (без имён)."""
    items: list[WishlistItemResponse]
