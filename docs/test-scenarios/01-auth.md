# 1. Регистрация и авторизация

Сценарии для переноса в Playwright: шаги с селекторами и проверки. Локаль в тестах — `ru` (тексты из `translations.ru`).

---

## US-1.1 Регистрация нового пользователя

**Как** новый пользователь **Я хочу** зарегистрироваться по email и паролю **Чтобы** создавать вишлисты и управлять ими.

### T1.1.1 Успешная регистрация

- **Роут:** `/login`
- **Предусловия:** нет. Опционально: уникальный email через `test.info().parallelIndex` или faker.
- **Шаги:**
  1. `page.goto('/login')`
  2. Клик по вкладке «Регистрация» → `page.getByRole('button', { name: 'Регистрация' }).click()`
  3. Заполнить Email → `page.locator('#register-email').fill('newuser@example.com')`
  4. Заполнить Пароль → `page.locator('#register-password').fill('password123')`
  5. Заполнить Повторите пароль → `page.locator('#register-password-confirm').fill('password123')`
  6. Отправить форму → `page.getByRole('button', { name: 'Зарегистрироваться' }).click()`
- **Проверки:**
  - URL стал главная/дашборд → `expect(page).toHaveURL(/\/$/)`
  - На странице виден дашборд: заголовок «Мои списки» или ссылка «Создать список» → `expect(page.getByRole('heading', { name: 'Мои списки' }).or(page.getByRole('link', { name: 'Создать список' }))).toBeVisible()`

---

### T1.1.2 Регистрация с уже занятым email

- **Роут:** `/login`
- **Предусловия:** в БД уже есть пользователь с email `user@example.com` (создать через API в `beforeEach`).
- **Шаги:**
  1. `page.goto('/login')`
  2. `page.getByRole('button', { name: 'Регистрация' }).click()`
  3. `page.locator('#register-email').fill('user@example.com')`
  4. `page.locator('#register-password').fill('password123')`
  5. `page.locator('#register-password-confirm').fill('password123')`
  6. `page.getByRole('button', { name: 'Зарегистрироваться' }).click()`
- **Проверки:**
  - Остаёмся на `/login` → `expect(page).toHaveURL(/\/login/)`
  - Видно сообщение об ошибке (например «Email уже занят» или общее от API) → `expect(page.locator('.text-destructive')).toContainText(/.+/)` или проверка текста из API.

---

### T1.1.3 Регистрация с невалидным email

- **Роут:** `/login`
- **Предусловия:** нет.
- **Шаги:**
  1. `page.goto('/login')`
  2. `page.getByRole('button', { name: 'Регистрация' }).click()`
  3. `page.locator('#register-email').fill('not-an-email')`
  4. `page.locator('#register-password').fill('password123')`
  5. `page.locator('#register-password-confirm').fill('password123')`
  6. `page.getByRole('button', { name: 'Зарегистрироваться' }).click()`
- **Проверки:**
  - Сообщение валидации (например «Некорректный email») → `expect(page.getByText(/Некорректный email|Invalid email/i)).toBeVisible()`
  - URL остаётся `/login` → `expect(page).toHaveURL(/\/login/)`

---

### T1.1.4 Регистрация со слабым паролем

- **Роут:** `/login`
- **Предусловия:** нет.
- **Шаги:**
  1. `page.goto('/login')`
  2. `page.getByRole('button', { name: 'Регистрация' }).click()`
  3. `page.locator('#register-email').fill('user@example.com')`
  4. `page.locator('#register-password').fill('123')`
  5. `page.locator('#register-password-confirm').fill('123')`
  6. `page.getByRole('button', { name: 'Зарегистрироваться' }).click()`
- **Проверки:**
  - Сообщение о требованиях к паролю (например «Пароль не менее 6 символов») → `expect(page.getByText(/Пароль не менее|at least 6/i)).toBeVisible()`
  - Остаёмся на `/login` → `expect(page).toHaveURL(/\/login/)`

---

## US-1.2 Вход в систему

**Как** зарегистрированный пользователь **Я хочу** войти по email и паролю **Чтобы** получить доступ к своим вишлистам.

### T1.2.1 Успешный вход

- **Роут:** `/login`
- **Предусловия:** пользователь зарегистрирован (создать через API или использовать существующие креды).
- **Шаги:**
  1. `page.goto('/login')`
  2. `page.locator('#login-email').fill('user@example.com')`
  3. `page.locator('#login-password').fill('validPassword')`
  4. `page.getByRole('button', { name: 'Войти' }).click()`
- **Проверки:**
  - Редирект на главную → `expect(page).toHaveURL(/\/$/)`
  - Виден дашборд → `expect(page.getByRole('heading', { name: 'Мои списки' })).toBeVisible()`

---

### T1.2.2 Неверный пароль

- **Роут:** `/login`
- **Предусловия:** пользователь с email существует.
- **Шаги:**
  1. `page.goto('/login')`
  2. `page.locator('#login-email').fill('user@example.com')`
  3. `page.locator('#login-password').fill('wrongPassword')`
  4. `page.getByRole('button', { name: 'Войти' }).click()`
- **Проверки:**
  - Ошибка на странице (текст от API или «Неверный email или пароль») → `expect(page.locator('.text-destructive')).toContainText(/.+/)`
  - URL остаётся `/login` → `expect(page).toHaveURL(/\/login/)`

---

### T1.2.3 Несуществующий email

- **Роут:** `/login`
- **Шаги:**
  1. `page.goto('/login')`
  2. `page.locator('#login-email').fill('nonexistent@example.com')`
  3. `page.locator('#login-password').fill('any')`
  4. `page.getByRole('button', { name: 'Войти' }).click()`
- **Проверки:**
  - Показана обобщённая ошибка (не раскрывать факт существования email) → `expect(page.locator('.text-destructive')).toBeVisible()`
  - Остаёмся на `/login` → `expect(page).toHaveURL(/\/login/)`

---

### T1.2.4 Выход

- **Роут:** `/` (дашборд, пользователь уже авторизован).
- **Предусловия:** залогинить пользователя (API или форма входа в `beforeEach`); на дашборде есть кнопка «Выйти» (в хедере/навбаре).
- **Шаги:**
  1. Открыть дашборд (после логина или `page.goto('/')` с сохранённым storage state).
  2. `page.getByRole('button', { name: 'Выйти' }).click()`
- **Проверки:**
  - Редирект на лендинг/главную → `expect(page).toHaveURL(/\/$/)`
  - На странице нет «Мои списки» (лендинг) или видна кнопка «Войти» → `expect(page.getByRole('link', { name: 'Войти' }).or(page.getByRole('button', { name: 'Войти' }))).toBeVisible()` (в зависимости от того, где кнопка на лендинге).
