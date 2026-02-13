-- Очистка всех данных, схемы таблиц не трогаем.
-- PostgreSQL. Запуск: psql "$DATABASE_URL" -f migrations/truncate_all_data.sql
-- Или через sync URL: psql "postgresql://user:pass@host:5432/db" -f migrations/truncate_all_data.sql

TRUNCATE TABLE
  contributions,
  reservations,
  wishlist_items,
  wishlists,
  users,
  items
RESTART IDENTITY
CASCADE;
