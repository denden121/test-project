-- Миграция: валюта вишлиста и минимальный вклад товара
-- PostgreSQL:
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'RUB';
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS min_contribution NUMERIC(18, 2) NULL;
