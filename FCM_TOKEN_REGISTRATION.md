# Процес реєстрації FCM токена

## Огляд

FCM (Firebase Cloud Messaging) токен - це унікальний ідентифікатор пристрою/браузера, який використовується для відправки push-сповіщень конкретному користувачу.

## Покроковий процес

### 1. Користувач входить в систему
- Користувач успішно авторизується через `index.astro`
- Встановлюються cookies: `jwt_token` та `username`
- Редірект на `/notifications`

### 2. Завантаження сторінки notifications
**Файл:** `src/pages/notifications.astro`

При завантаженні сторінки автоматично викликається функція `initializeFCM()`:

```javascript
// Initialize FCM on page load
initializeFCM();
```

### 3. Ініціалізація Firebase Cloud Messaging

**Функція:** `initializeFCM()`

#### Крок 3.1: Реєстрація Service Worker
```javascript
await registerServiceWorker();
// Реєструє /firebase-messaging-sw.js
// Service Worker потрібен для отримання фонових сповіщень
```

#### Крок 3.2: Ініціалізація Firebase App
```javascript
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
```

Використовує конфігурацію з `.env`:
- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_PROJECT_ID`
- `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- тощо

#### Крок 3.3: Запит дозволу на сповіщення
```javascript
const permission = await Notification.requestPermission();
```

Браузер показує діалог:
- ✅ **"Дозволити"** → permission = 'granted'
- ❌ **"Заблокувати"** → permission = 'denied'
- ⏸️ **Закрити діалог** → permission = 'default'

#### Крок 3.4: Отримання FCM токена
Якщо дозвіл надано:
```javascript
const token = await getToken(messaging, { vapidKey: VAPID_KEY });
```

Firebase генерує унікальний токен для цього браузера/пристрою.

Приклад токена:
```
eozr3ymZLBhvANbIWjIOPd:APA91bGz2cW88WKECiWUWtpanmAPXm7Lf4-6-PrH9Fsw5KLYvPZw1rbtlz4riGPAyGORkbk_zTKYOawaXzgrdNePWxSSCqnn9bzLgbPOT4RbKFFGUobcMjU
```

### 4. Реєстрація токена на backend

**Функція:** `registerFCMToken(token)`

#### Крок 4.1: Відправка токена на API
```javascript
const response = await fetch('/api/fcm/register-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fcm_token: token })
});
```

#### Крок 4.2: Обробка на сервері
**Файл:** `src/pages/api/fcm/register-token.ts`

1. **Перевірка автентифікації:**
```typescript
const username = requireAuth(cookies);
// Отримує username з cookie
```

2. **Перевірка чи існує токен для цього користувача:**
```typescript
const existing = await db
  .select()
  .from(FCMToken)
  .where(eq(FCMToken.username, username))
  .get();
```

3. **Оновлення або створення запису:**

**Якщо токен вже існує** (користувач раніше входив):
```typescript
await db
  .update(FCMToken)
  .set({ 
    fcm_token: token,
    updated_at: new Date()
  })
  .where(eq(FCMToken.username, username));
```

**Якщо це новий користувач:**
```typescript
await db.insert(FCMToken).values({
  username: username,
  fcm_token: token,
  created_at: new Date(),
  updated_at: new Date()
});
```

### 5. Збереження в базі даних

**База даних:** Turso (libSQL)
**Таблиця:** `FCMToken`

**Структура таблиці:**
```sql
CREATE TABLE FCMToken (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  fcm_token TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

**Приклад запису:**
```
id: 1
username: "operator123"
fcm_token: "eozr3ymZLBhvANbIWjIOPd:APA91b..."
created_at: 2025-01-13 10:30:00
updated_at: 2025-01-13 10:30:00
```

### 6. Налаштування обробника повідомлень

Після успішної реєстрації налаштовується обробник для foreground повідомлень:

```javascript
onMessage(messaging, (payload) => {
  console.log('Foreground message received:', payload);
  
  // Додати сповіщення в UI
  addNotificationToUI({
    title: payload.notification.body,
    timestamp: new Date(),
    status: 'New',
    id: payload.data?.notificationId
  });
});
```

## Використання токена

### Відправка push-сповіщення

**Файл:** `src/pages/api/notifications/webhook.ts`

1. **Backend отримує webhook** з новим сповіщенням
2. **Знаходить FCM токен користувача:**
```typescript
const fcmTokenRecord = await db
  .select()
  .from(FCMToken)
  .where(eq(FCMToken.username, username))
  .get();
```

3. **Відправляє push через Firebase Admin SDK:**
```typescript
await admin.messaging().send({
  token: fcmTokenRecord.fcm_token,
  notification: {
    title: 'Нове сповіщення',
    body: notification_title
  },
  data: {
    notificationId: String(notificationId)
  }
});
```

4. **Firebase доставляє сповіщення:**
   - Якщо браузер відкритий → foreground handler (onMessage)
   - Якщо браузер закритий → Service Worker показує нативне сповіщення

## Діаграма потоку

```
┌─────────────────┐
│  Користувач     │
│  входить        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ notifications   │
│ .astro          │
│ завантажується  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ initializeFCM() │
│ викликається    │
└────────┬────────┘
         │
         ├─► Реєструє Service Worker
         │
         ├─► Ініціалізує Firebase
         │
         ├─► Запитує дозвіл
         │
         ▼
┌─────────────────┐
│ Дозвіл надано?  │
└────────┬────────┘
         │ Так
         ▼
┌─────────────────┐
│ getToken()      │
│ отримує FCM     │
│ токен           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ registerFCMToken│
│ відправляє на   │
│ /api/fcm/       │
│ register-token  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ API перевіряє   │
│ автентифікацію  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Зберігає токен  │
│ в Turso DB      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Токен готовий   │
│ для відправки   │
│ push-сповіщень  │
└─────────────────┘
```

## Важливі моменти

### Безпека
- ✅ FCM токен зберігається з прив'язкою до username
- ✅ API endpoint перевіряє автентифікацію через cookies
- ✅ Один користувач = один токен (оновлюється при повторному вході)

### Обробка помилок
- Якщо дозвіл відхилено → показується попередження, але додаток працює
- Якщо реєстрація не вдалась → автоматичний retry (2 спроби)
- Якщо всі спроби не вдалися → тихо ігнорується (додаток працює без push)

### Оновлення токена
- Токен може змінитися при:
  - Очищенні кешу браузера
  - Переустановці додатку
  - Зміні Firebase конфігурації
- При кожному вході токен оновлюється в БД

### Час життя
- FCM токен не має терміну дії
- Але може стати недійсним якщо:
  - Користувач видалив дані браузера
  - Додаток був видалений
  - Firebase проект був видалений

## Тестування

Перевірте логи в консолі браузера:
```
✅ Service Worker registered
✅ Notification permission granted
✅ FCM Token retrieved: eozr3y...
✅ FCM token registered successfully
```

Перевірте логи на сервері:
```
=== FCM Token Registration API called ===
✅ User authenticated: operator123
✅ FCM token updated successfully
```
