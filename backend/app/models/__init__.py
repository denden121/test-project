import secrets
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def generate_slug() -> str:
    """Generate a unique URL-safe slug for sharing."""
    return secrets.token_urlsafe(12)


class User(Base):
    """Пользователь для регистрации и авторизации."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)  # None для OAuth-пользователей
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Wishlist(Base):
    """
    Список желаний. Создатель делится им по ссылке с уникальным slug.
    creator_secret — только создатель знает, нужен для редактирования списка.
    """
    __tablename__ = "wishlists"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255))  # "День рождения", "Новый год" и т.д.
    slug: Mapped[str] = mapped_column(String(64), unique=True, default=generate_slug, index=True)
    creator_secret: Mapped[str] = mapped_column(String(64), default=generate_slug)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    items: Mapped[list["WishlistItem"]] = relationship(
        "WishlistItem",
        back_populates="wishlist",
        cascade="all, delete-orphan",
        order_by="WishlistItem.sort_order",
    )


class WishlistItem(Base):
    """Товар в списке желаний."""
    __tablename__ = "wishlist_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    wishlist_id: Mapped[int] = mapped_column(ForeignKey("wishlists.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))  # Название товара
    link: Mapped[str | None] = mapped_column(String(2048), nullable=True)  # Ссылка на товар
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)  # Картинка
    sort_order: Mapped[int] = mapped_column(default=0)  # Порядок отображения
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    wishlist: Mapped["Wishlist"] = relationship("Wishlist", back_populates="items")
    reservation: Mapped["Reservation | None"] = relationship(
        "Reservation",
        back_populates="item",
        uselist=False,
        cascade="all, delete-orphan",
    )
    contributions: Mapped[list["Contribution"]] = relationship(
        "Contribution",
        back_populates="item",
        cascade="all, delete-orphan",
    )


class Contribution(Base):
    """
    Вклад в подарок (скинуться). Владелец вишлиста видит только сумму по товару,
    не видит кто сколько скинул.
    """
    __tablename__ = "contributions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    wishlist_item_id: Mapped[int] = mapped_column(
        ForeignKey("wishlist_items.id", ondelete="CASCADE"),
    )
    contributor_name: Mapped[str] = mapped_column(String(255))
    contributor_secret: Mapped[str] = mapped_column(String(64), default=generate_slug, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    contributed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    item: Mapped["WishlistItem"] = relationship("WishlistItem", back_populates="contributions")


class Reservation(Base):
    """
    Резервация подарка. Создатель списка НЕ видит reserver_name и reserver_secret —
    это обеспечивается на уровне API/логики доступа.
    """
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    wishlist_item_id: Mapped[int] = mapped_column(
        ForeignKey("wishlist_items.id", ondelete="CASCADE"),
        unique=True,  # Один подарок — одна резервация
    )
    reserver_name: Mapped[str] = mapped_column(String(255))  # "Маша" — видит только сам резервировавший
    reserver_secret: Mapped[str] = mapped_column(String(64), default=generate_slug, index=True)
    reserved_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    item: Mapped["WishlistItem"] = relationship("WishlistItem", back_populates="reservation")


# Legacy model — можно удалить после миграции старых данных
class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
