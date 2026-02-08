from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


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
