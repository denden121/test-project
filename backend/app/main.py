import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, contributions, health, items, reservations, wishlists
from app.db.session import init_db

logger = logging.getLogger(__name__)

OPENAPI_TAGS = [
    {
        "name": "wishlists",
        "description": "Списки желаний. Создание, просмотр, управление товарами. "
        "**slug** — для шаринга друзьям. **creator_secret** — только создателю для редактирования.",
    },
    {
        "name": "reservations",
        "description": "Резервации подарков. Просмотр и отмена по **reserver_secret** после резервирования.",
    },
    {
        "name": "contributions",
        "description": "Вклады «скинуться». Просмотр и отмена по **contributor_secret**. Владелец видит только сумму.",
    },
    {"name": "auth", "description": "Регистрация и авторизация."},
    {"name": "health", "description": "Проверка доступности API."},
    {"name": "items", "description": "Legacy эндпоинты (items)."},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
    except Exception as e:  # init_db can raise DB/network errors
        logger.warning("Database init skipped (unavailable): %s", e)
    yield
    # cleanup if needed


app = FastAPI(
    title="Wishlist API",
    description="""
API для списков желаний (вишлистов).

## Сценарий использования
1. **Создать список** → `POST /api/wishlists` — получите `slug` и `creator_secret`
2. **Шаринг** — делитесь ссылкой `/wishlists/s/{slug}` с друзьями
3. **Друзья** — смотрят список, резервируют подарки (чтобы не повторяться)
4. **Создатель** — управляет списком по `creator_secret`, видит только флаг «зарезервировано» (без имён — сюрприз сохраняется)
    """,
    version="1.0.0",
    openapi_tags=OPENAPI_TAGS,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(items.router, prefix="/api/items", tags=["items"])
app.include_router(wishlists.router, prefix="/api/wishlists", tags=["wishlists"])
app.include_router(reservations.router, prefix="/api/reservations", tags=["reservations"])
app.include_router(contributions.router, prefix="/api/contributions", tags=["contributions"])


@app.get("/")
async def root():
    return {"message": "Test Project API"}
