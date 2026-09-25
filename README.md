# Pulse CRM

Standalone CRM на Next.js 16 + Turso/SQLite.

## Быстрый старт

1. Скопируйте `.env.example` → `.env.local` и задайте `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
   Для генерации постов добавьте `GEMINI_API_KEY` (опционально `GEMINI_MODEL`, по умолчанию `gemini-2.5-flash`).
2. Без Turso облака используется локальный файл `data/crm.db` (`TURSO_DATABASE_URL=file:./data/crm.db`).
3. Создайте админа:

```bash
npm run seed:admin
```

4. Запустите:

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) → `/login`.

## Роли

- `admin` — все заявки/задачи, пользователи, полная аналитика
- `manager` — только свои заявки/задачи и своя аналитика

## Контент для соцсетей

Раздел `/content`: тема → Telegram / YouTube / Instagram → 3 варианта поста (заголовок, текст, CTA, хэштеги) через Gemini. Поток текста идёт по SSE, история хранится в `generated_posts`.

## Заметки

- В Next.js 16 auth-gate реализован через `proxy.ts` (вместо deprecated `middleware.ts`).
- Приём заявок с сайта: `POST /api/ingest/feedback` с заголовком `Authorization: Bearer $CRM_INGEST_SECRET`.
  Тело: `{ "name", "contact", "message" }` → клиент + лид со статусом `new`, источник `website_form`.
