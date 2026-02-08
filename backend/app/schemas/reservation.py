from datetime import datetime

from pydantic import BaseModel, Field


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
