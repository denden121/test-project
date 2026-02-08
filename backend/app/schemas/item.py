from pydantic import BaseModel


class ItemCreate(BaseModel):
    title: str
    description: str | None = None


class ItemResponse(BaseModel):
    id: int
    title: str
    description: str | None

    class Config:
        from_attributes = True
