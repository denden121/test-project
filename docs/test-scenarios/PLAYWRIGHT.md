# Как писать тесты Playwright по сценариям

В каждом файле сценарии описаны в формате, удобном для переноса в `test(...)` Playwright: **шаги** с указанием селекторов и **проверки** (assertions).

## Конвенции

- **Локаль:** тесты предполагают одну локаль (например `ru`). Задавайте её в `beforeEach` через cookie или переключатель в UI, чтобы тексты кнопок/лейблов были стабильными. В сценариях указаны русские тексты из `translations.ru`.
- **Базовый URL:** из `baseURL` в конфиге Playwright (например `http://localhost:3000`). Роуты в сценариях указаны как пути (`/login`, `/wishlists/s/{slug}`).
- **Селекторы:** предпочтительно `page.getByRole('button', { name: '...' })`, `page.getByLabel('...')`; для полей с фиксированным `id` — `page.locator('#login-email')` и т.д.
- **Один сценарий = один `test(...)`.** Идентификатор сценария (T1.1.1 и т.д.) можно использовать в названии теста или в `test.describe` для трассировки.

## Основные селекторы приложения

| Элемент | Селектор (ru) |
|--------|----------------|
| Поле Email (логин) | `#login-email` или `getByLabel('Email')` |
| Поле Пароль (логин) | `#login-password` или `getByLabel('Пароль')` |
| Поле Email (регистрация) | `#register-email` |
| Поле Пароль (регистрация) | `#register-password` |
| Повторите пароль | `#register-password-confirm` |
| Вкладка «Вход» | `getByRole('button', { name: 'Вход' })` |
| Вкладка «Регистрация» | `getByRole('button', { name: 'Регистрация' })` |
| Кнопка «Войти» | `getByRole('button', { name: 'Войти' })` |
| Кнопка «Зарегистрироваться» | `getByRole('button', { name: 'Зарегистрироваться' })` |
| Кнопка «Выйти» | `getByRole('button', { name: 'Выйти' })` |
| Ссылка «Создать список» | `getByRole('link', { name: 'Создать список' })` |
| Название списка (форма) | `#title` или `getByLabel('Название списка')` |
| Кнопка «Создать» (вишлист) | `getByRole('button', { name: 'Создать' })` |
| Кнопка «Управление списком» | `getByRole('link', { name: 'Управление списком' })` |
| Кнопка «Зарезервировать подарок» | `getByRole('button', { name: 'Зарезервировать подарок' })` (в карточке товара) |
| Кнопка «Скинуться» | `getByRole('button', { name: 'Скинуться' })` |
| Кнопка «Отменить резервацию» | `getByRole('button', { name: 'Отменить резервацию' })` |
| Кнопка «Отменить вклад» | `getByRole('button', { name: 'Отменить вклад' })` |
| Сообщение об ошибке | `.text-destructive` или по тексту |

## Роуты

| Путь | Описание |
|------|----------|
| `/` | Лендинг (гость) или дашборд (авторизован) |
| `/login` | Вход / Регистрация (вкладки) |
| `/wishlists/new` | Создание вишлиста (требуется авторизация) |
| `/wishlists/manage/:creatorSecret` | Управление списком |
| `/wishlists/s/:slug` | Публичный вишлист |
| `/reservations/:reserverSecret` | Моя резервация |
| `/contributions/:contributorSecret` | Мой вклад |

## Пример теста по сценарию

Сценарий **T1.2.1 Успешный вход** из [01-auth.md](./01-auth.md):

```ts
import { test, expect } from '@playwright/test'

test('T1.2.1 Успешный вход', async ({ page }) => {
  // Предусловие: пользователь зарегистрирован (через API или fixture)
  await page.goto('/login')

  await page.getByLabel('Email').fill('user@example.com')
  await page.getByLabel('Пароль').fill('validPassword')
  await page.getByRole('button', { name: 'Войти' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Мои списки' })).toBeVisible()
})
```

Для сценариев с **подготовкой данных** (вишлист с товарами, резервации) используйте API-запросы в `test.beforeEach` или отдельный fixture, который создаёт вишлист/товар и возвращает `slug`, `creator_secret`, `reserver_secret` и т.д.
