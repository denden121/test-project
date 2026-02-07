# Test Project

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

### Бэкенд (Railway / Render / Fly.io)

- Разверните папку `backend/` как Python-сервис.
- Укажите команду: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Добавьте переменную `DATABASE_URL` (PostgreSQL).  
  Для **Vercel Postgres** или **Neon** скопируйте connection string и при необходимости замените схему на `postgresql+asyncpg://...` (для SQLAlchemy async).

### База данных

- **Vercel Postgres** или **Neon**: создайте проект, скопируйте `DATABASE_URL` в настройки бэкенда.
- Либо любой другой PostgreSQL (Railway, Render, Supabase и т.д.).

## Репозиторий

Репозиторий: https://github.com/denden121/test-project

Клонирование:

```bash
git clone https://github.com/denden121/test-project.git
cd test-project
```

После клонирования выполните шаги из раздела «Локальный запуск».
