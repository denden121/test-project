-- Миграция: добавить поля occasion и event_date в wishlists
-- Для существующих БД. Новая установка создаст таблицы через create_all.
-- PostgreSQL: IF NOT EXISTS поддерживается. SQLite: выполнить по одному разу.

-- PostgreSQL:
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS occasion VARCHAR(255) NULL;
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS event_date DATE NULL;

-- SQLite (если IF NOT EXISTS недоступен):
-- ALTER TABLE wishlists ADD COLUMN occasion VARCHAR(255);
-- ALTER TABLE wishlists ADD COLUMN event_date DATE;
