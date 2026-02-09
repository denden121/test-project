-- Миграция: привязка вишлистов к пользователю
-- user_id — владелец (если был залогинен при создании)
-- Выполнить один раз. При повторном запуске ADD COLUMN IF NOT EXISTS безопасен.

ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;
ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS fk_wishlists_user_id;
ALTER TABLE wishlists ADD CONSTRAINT fk_wishlists_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_wishlists_user_id ON wishlists(user_id);
