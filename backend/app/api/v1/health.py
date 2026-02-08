from datetime import datetime, timezone
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/test")
async def test():
    """Тестовая ручка для проверки связи фронт–бэк."""
    return {
        "message": "Test OK",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "backend",
    }
