# Pulse CRM

Standalone CRM на Next.js 16 + Turso/SQLite.

## Быстрый старт

1. Скопируйте `.env.example` → `.env.local` и задайте `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
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

## Заметки

- В Next.js 16 auth-gate реализован через `proxy.ts` (вместо deprecated `middleware.ts`).
- Интеграции с формой сайта и Telegram webhook — по спеке, отдельным шагом после деплоя.
