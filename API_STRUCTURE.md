# Структура API endpoints

## Проблема з вкладеними папками

Astro не підтримує API endpoints у вкладених папках типу `/api/notifications/webhook.ts`.
Всі API endpoints мають бути безпосередньо в папці `src/pages/api/`.

## Поточна структура

### ✅ Працюють (в кореневій папці api/)

```
src/pages/api/
├── login.ts              → POST /api/login
├── logout.ts             → POST /api/logout  
├── webhook.ts            → POST /api/webhook
├── mark-read.ts          → POST /api/mark-read
└── register-fcm-token.ts → POST /api/register-fcm-token (не використовується)
```

### ❌ Не працюють (у вкладених папках)

```
src/pages/api/
├── auth/
│   ├── login.ts          → 404
│   └── logout.ts         → 404
├── notifications/
│   ├── webhook.ts        → 404
│   └── mark-read.ts      → 404
└── fcm/
    └── register-token.ts → 404
```

## SSR сторінки (альтернатива API)

Замість API endpoints використовуємо SSR сторінки:

```
src/pages/
├── index.astro           → GET/POST /          (login)
├── logout.astro          → GET /logout         (logout)
├── register-fcm.astro    → POST /register-fcm  (FCM token)
└── notifications.astro   → GET /notifications  (list)
```

## Мапінг старих → нових шляхів

| Старий шлях | Новий шлях | Тип |
|-------------|------------|-----|
| `/api/auth/login` | `/` (index.astro) | SSR |
| `/api/auth/logout` | `/logout` | SSR |
| `/api/fcm/register-token` | `/register-fcm` | SSR |
| `/api/notifications/webhook` | `/api/webhook` | API |
| `/api/notifications/mark-read` | `/api/mark-read` | API |

## Рекомендації

### Для нових endpoints:

1. **Якщо потрібен JSON API** → створюйте в `src/pages/api/[name].ts`
2. **Якщо потрібна форма/редірект** → створюйте SSR сторінку `src/pages/[name].astro`

### Переваги SSR:
- ✅ Швидше (немає timeout)
- ✅ Простіше (менше коду)
- ✅ Надійніше (server-side обробка)
- ✅ SEO friendly (якщо потрібно)

### Переваги API:
- ✅ JSON response
- ✅ Можна викликати з зовнішніх джерел
- ✅ RESTful архітектура

## Приклади використання

### API endpoint (webhook)

**Файл:** `src/pages/api/webhook.ts`

```typescript
export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  // ... обробка
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

**Виклик:**
```javascript
fetch('/api/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data })
});
```

### SSR сторінка (register-fcm)

**Файл:** `src/pages/register-fcm.astro`

```astro
---
if (Astro.request.method === 'POST') {
  const formData = await Astro.request.formData();
  // ... обробка
  return new Response(JSON.stringify({ success: true }));
}
---
```

**Виклик:**
```javascript
const formData = new FormData();
formData.append('fcm_token', token);
fetch('/register-fcm', {
  method: 'POST',
  body: formData
});
```

## Очищення старих файлів

Можна видалити старі файли у вкладених папках:

```bash
rm -rf src/pages/api/auth/
rm -rf src/pages/api/notifications/
rm -rf src/pages/api/fcm/
```

Або залишити для документації/історії.
