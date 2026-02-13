-- Колонки для сброса пароля (users). Выполнить один раз.
-- init_db() тоже добавляет их при старте приложения.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS ix_users_password_reset_token ON users(password_reset_token);
