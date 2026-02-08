# Test Project

[![Tests (backend)](https://github.com/denden121/test-project/actions/workflows/test.yml/badge.svg)](https://github.com/denden121/test-project/actions/workflows/test.yml)
[![E2E (Playwright)](https://github.com/denden121/test-project/actions/workflows/e2e.yml/badge.svg)](https://github.com/denden121/test-project/actions/workflows/e2e.yml)
[![SonarCloud](https://sonarcloud.io/api/project_badges/measure?project=denden121_test-project&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=denden121_test-project)

Стек: **React** (frontend) + **FastAPI** (backend) + **PostgreSQL**.

Подходит для деплоя фронта на [Vercel](https://vercel.com); бэкенд и БД — на Railway, Render, Neon или Vercel Postgres.

## Структура

```
├── frontend/          # React (Vite) + TypeScript
├── backend/           # FastAPI + SQLAlchemy (async) + PostgreSQL
├── vercel.json        # конфиг деплоя фронта на Vercel
└── README.md
```

## Локальный запуск

### 1. PostgreSQL

Запустите PostgreSQL (Docker или локально) и создайте БД:

```bash
createdb test_project
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # задайте DATABASE_URL
uvicorn app.main:app --reload --port 8000
```

API: http://localhost:8000  
Документация: http://localhost:8000/docs  

#### Тесты

```bash
cd backend
pip install -r requirements.txt   # pytest, httpx, aiosqlite уже в requirements
pytest tests/ -v
```

Тесты используют SQLite in-memory, PostgreSQL не нужен.

#### E2E (Playwright)

Запуск e2e-тестов (нужны запущенные бэкенд на :8000 и фронт на :3000):

```bash
cd frontend
npm install
npx playwright install --with-deps chromium   # один раз
npm run e2e
```

Локально можно не поднимать серверы вручную: без `CI` Playwright сам запустит `npm run dev` (прокси на бэкенд). Для запросов к API из тестов задайте `API_URL=http://localhost:8000` при необходимости.

В CI (GitHub Actions) используется workflow `.github/workflows/e2e.yml`: поднимаются бэкенд (SQLite in-memory) и фронт, затем запускаются тесты Playwright.

#### SonarCloud

Анализ кода в [SonarCloud](https://sonarcloud.io): проект `denden121_test-project`, организация `denden121`. Конфиг — `sonar-project.properties`, workflow — `.github/workflows/sonarcloud.yml`. В настройках репозитория GitHub добавьте секрет **SONAR_TOKEN** (токен из SonarCloud: Account → Security → Generate Tokens).

**Локальный запуск анализа:**

```bash
# из корня репозитория
npm install
export SONAR_TOKEN=ваш_токен_из_sonarcloud
npm run sonar
```

Результаты загрузятся в SonarCloud; замечания можно смотреть в веб-интерфейсе.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Фронт: http://localhost:3000 (прокси на `/api` → `localhost:8000`).

## Деплой на Vercel

### Фронтенд (Vercel)

1. Импортируйте репозиторий в [Vercel](https://vercel.com).
2. **Root Directory**: оставьте корень репозитория (используется `vercel.json`).
3. Переменные окружения (если бэк развёрнут отдельно):
   - `VITE_API_URL` = `https://your-api.railway.app` (или ваш URL API).
4. Deploy.

В `vercel.json` уже заданы `buildCommand`, `outputDirectory` и `installCommand` для папки `frontend`.

### Бэкенд: как развернуть (Railway)

1. Зайдите на [railway.app](https://railway.app), войдите через GitHub.
2. **New Project** → **Deploy from GitHub repo** → выберите `denden121/test-project`.
3. В проекте нажмите на созданный сервис → **Settings**:
   - **Root Directory**: укажите `backend`.
   - **Build Command**: `pip install -r requirements.txt` (или оставьте авто).
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. **Variables** → добавьте переменную:
   - `DATABASE_URL` — connection string PostgreSQL (см. ниже).
5. База на Railway: в том же проекте **New** → **Database** → **PostgreSQL**. Railway создаст БД и добавит `DATABASE_URL` в переменные. Для SQLAlchemy async строка должна быть вида `postgresql+asyncpg://...` — если скопировали `postgresql://...`, замените в начале на `postgresql+asyncpg://`.
6. **Deploy**. После деплоя возьмите **Public URL** (например `https://test-project-production-xxx.up.railway.app`).
7. В настройках фронта на Vercel добавьте переменную **VITE_API_URL** = этот URL (без слэша в конце) и пересоберите фронт.

Тестовая ручка: `GET /api/test` — возвращает `{ "message": "Test OK", "timestamp": "...", "source": "backend" }`. Фронт дергает её при загрузке и по кнопке «Обновить».

### Бэкенд на Render

- **New** → **Web Service**, подключите репозиторий.
- **Root Directory**: `backend`.
- **Build**: `pip install -r requirements.txt`.
- **Start**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Добавьте **Environment Variable** `DATABASE_URL` (PostgreSQL можно создать в Render же: **New** → **PostgreSQL**).

### База данных

- **Railway / Render**: создать PostgreSQL в том же проекте и подставить `DATABASE_URL` (для async драйвера используйте `postgresql+asyncpg://...`).
- **Neon** или **Vercel Postgres**: скопируйте connection string и при необходимости замените схему на `postgresql+asyncpg://...`.

## Репозиторий

Репозиторий: https://github.com/denden121/test-project

Клонирование:

```bash
git clone https://github.com/denden121/test-project.git
cd test-project
```

После клонирования выполните шаги из раздела «Локальный запуск».
