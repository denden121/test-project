# Структура FastAPI проекта

Структура организована по [best practices FastAPI](https://fastapi.tiangolo.com/tutorial/bigger-applications/).

```
backend/app/
├── main.py                 # Точка входа, lifespan, подключение роутеров
├── core/                   # Ядро приложения
│   ├── config.py           # Настройки (pydantic-settings)
│   └── security.py         # JWT, хеширование паролей
├── db/                     # База данных
│   ├── base.py             # SQLAlchemy DeclarativeBase
│   └── session.py          # engine, async_session, get_db, init_db
├── models/                 # SQLAlchemy модели
│   └── __init__.py         # User, Wishlist, WishlistItem, Contribution, Reservation, Item
├── schemas/                # Pydantic схемы (по доменам)
│   ├── auth.py
│   ├── wishlist.py
│   ├── reservation.py
│   ├── contribution.py
│   └── item.py
├── api/                    # API слой
│   ├── deps.py             # Зависимости (get_db, get_current_user)
│   └── v1/                 # Версионированные роутеры
│       ├── auth.py
│       ├── health.py
│       ├── items.py
│       ├── wishlists.py
│       ├── reservations.py
│       └── contributions.py
└── services/               # Бизнес-логика
    ├── websocket.py        # WebSocket ConnectionManager
    └── wishlist.py         # Хелперы вишлиста (item_to_response, broadcast)
```

## Принципы

- **Разделение ответственности**: config/security в core, БД в db, API в api
- **Версионирование API**: роутеры в api/v1/ для будущего v2
- **Без циклических импортов**: reservations/contributions используют services.wishlist, а не wishlists router
- **Схемы по доменам**: auth, wishlist, reservation, contribution, item
