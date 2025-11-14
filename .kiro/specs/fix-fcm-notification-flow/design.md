# Design Document

## Overview

Цей документ описує дизайн виправленого потоку обробки push-сповіщень згідно з офіційною документацією Firebase Cloud Messaging. Основна зміна полягає в тому, що FCM push-сповіщення відправляються **спочатку**, а збереження в базі даних відбувається **після** успішної доставки до клієнта.

## Architecture

### Current Flow (Incorrect)
```
External System → Webhook API → Save to DB → Send FCM Push → Client
```

### New Flow (Correct, according to Firebase docs)
```
External System → Webhook API → Send FCM Push → Client → Save to DB API → Database
```

### Key Changes

1. **Webhook API** відправляє тільки FCM push (не зберігає в БД)
2. **Client-side Handler** отримує FCM push та зберігає в БД через новий API endpoint
3. **Service Worker** обробляє background messages та також викликає збереження в БД

## Components and Interfaces

### 1. Webhook API Endpoint (`/api/notifications/webhook.ts`)

**Responsibilities:**
- Приймати запити на створення сповіщень
- Відправляти FCM push-сповіщення до клієнта
- Повертати статус відправки

**Changes:**
- Видалити код збереження в БД
- Залишити тільки відправку FCM
- Повертати messageId від FCM для tracking

**Interface:**
```typescript
POST /api/notifications/webhook

Request Body:
{
  username: string;
  notification_title: string;
}

Response:
{
  success: boolean;
  fcmMessageId?: string;  // ID повідомлення від FCM
  error?: string;
}
```

### 2. New Save Notification API (`/api/notifications/save.ts`)

**Responsibilities:**
- Зберігати сповіщення в базі даних
- Валідувати дані сповіщення
- Повертати створений запис

**Interface:**
```typescript
POST /api/notifications/save

Request Body:
{
  notification_title: string;
  fcm_message_id?: string;  // Optional, для tracking
  timestamp?: string;        // Optional, час отримання FCM
}

Response:
{
  success: boolean;
  notification?: {
    id: number;
    username: string;
    notification_title: string;
    status: string;
    created_at: string;
  };
  error?: string;
}
```

### 3. Client-side FCM Handler (`notifications.astro`)

**Responsibilities:**
- Обробляти foreground messages через `onMessage()`
- Зберігати отримані сповіщення в БД
- Оновлювати UI без перезагрузки
- Показувати browser notification

**Changes:**
```javascript
// In notifications.astro <script>
onMessage(messaging, async (payload) => {
  console.log('Message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'Нове сповіщення';
  const notificationBody = payload.notification?.body || '';
  const fcmMessageId = payload.data?.notificationId;
  
  // 1. Show browser notification
  if (Notification.permission === 'granted') {
    new Notification(notificationTitle, { 
      body: notificationBody,
      icon: '/favicon.svg',
      badge: '/favicon.svg'
    });
  }
  
  // 2. Save to database
  await saveNotificationToDB({
    notification_title: notificationBody,
    fcm_message_id: fcmMessageId,
    timestamp: new Date().toISOString()
  });
  
  // 3. Update UI
  showToast('Нове сповіщення отримано!', 'info');
  await fetchAndUpdateNotifications();
});
```

### 4. Service Worker (`firebase-messaging-sw.js`)

**Responsibilities:**
- Обробляти background messages через `onBackgroundMessage()`
- Показувати системні сповіщення
- Зберігати дані для подальшої обробки
- Відкривати додаток при кліку

**Changes:**
```javascript
// In firebase-messaging-sw.js
messaging.onBackgroundMessage(async (payload) => {
  console.log('[SW] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'СВУП';
  const notificationBody = payload.notification?.body || 'Нове сповіщення';
  const notificationId = payload.data?.notificationId;
  
  // 1. Show system notification
  await self.registration.showNotification(notificationTitle, {
    body: notificationBody,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'notification-' + Date.now(),
    data: {
      url: '/notifications',
      notificationBody: notificationBody,
      notificationId: notificationId,
      timestamp: new Date().toISOString()
    }
  });
  
  // 2. Save to database (using fetch in SW context)
  try {
    await fetch('/api/notifications/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notification_title: notificationBody,
        fcm_message_id: notificationId,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('[SW] Failed to save notification:', error);
    // Store in IndexedDB for retry later
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/notifications';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('/notifications') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
```

## Data Models

### Notification Table (No changes)
```typescript
{
  id: number;              // Primary key
  username: string;        // User identifier
  notification_title: string;  // Notification content
  status: 'New' | 'Read';  // Read status
  created_at: Date;        // Creation timestamp
}
```

### FCM Message Payload
```typescript
{
  notification: {
    title: string;
    body: string;
  };
  data: {
    notificationId?: string;  // For tracking
    timestamp?: string;       // FCM send time
  };
  webpush: {
    fcmOptions: {
      link: string;  // URL to open on click
    }
  }
}
```

## Error Handling

### 1. FCM Send Failures

**Scenario:** FCM token invalid or expired

**Handling:**
```typescript
try {
  const response = await messaging.send(message);
  return { success: true, fcmMessageId: response };
} catch (error) {
  if (error.code === 'messaging/invalid-registration-token') {
    // Remove invalid token from database
    await db.delete(FCMToken).where(eq(FCMToken.username, username));
  }
  console.error('FCM send failed:', error);
  return { success: false, error: error.message };
}
```

### 2. Database Save Failures

**Scenario:** Network error or database unavailable

**Handling:**
```typescript
async function saveNotificationToDB(data, retryCount = 0) {
  const MAX_RETRIES = 2;
  
  try {
    const response = await fetch('/api/notifications/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Save failed');
    
    return await response.json();
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return saveNotificationToDB(data, retryCount + 1);
    }
    console.error('Failed to save after retries:', error);
    // Store in localStorage for later retry
    storeFailedNotification(data);
  }
}
```

### 3. Service Worker Context

**Scenario:** Service Worker не може зберегти сповіщення

**Handling:**
```javascript
// In Service Worker
async function saveWithFallback(data) {
  try {
    const response = await fetch('/api/notifications/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Save failed');
  } catch (error) {
    // Store in IndexedDB for retry when app opens
    const db = await openIndexedDB();
    await db.add('pending-notifications', data);
  }
}
```

## Testing Strategy

### 1. Unit Tests

**Test Cases:**
- Webhook API відправляє FCM без збереження в БД
- Save API коректно зберігає сповіщення
- Client handler викликає save API після отримання FCM
- Retry logic працює при помилках

### 2. Integration Tests

**Test Cases:**
- End-to-end flow: Webhook → FCM → Client → Save → DB
- Background message flow: Webhook → FCM → SW → Save → DB
- Error scenarios: Invalid token, DB unavailable, network errors

### 3. Manual Testing

**Test Scenarios:**
1. **Foreground notification:**
   - Відкрити /notifications
   - Відправити webhook запит
   - Перевірити: browser notification, toast, оновлення списку

2. **Background notification:**
   - Закрити додаток
   - Відправити webhook запит
   - Перевірити: системне сповіщення
   - Клікнути на сповіщення
   - Перевірити: додаток відкрився, сповіщення в списку

3. **Error handling:**
   - Вимкнути інтернет
   - Відправити webhook запит
   - Увімкнути інтернет
   - Перевірити: retry спрацював, сповіщення збережено

## Migration Plan

### Phase 1: Create New Save API
1. Створити `/api/notifications/save.ts`
2. Протестувати збереження через новий endpoint
3. Додати retry logic

### Phase 2: Update Client Handler
1. Оновити `onMessage()` handler в `notifications.astro`
2. Додати виклик save API після отримання FCM
3. Протестувати foreground notifications

### Phase 3: Update Service Worker
1. Оновити `onBackgroundMessage()` в `firebase-messaging-sw.js`
2. Додати виклик save API
3. Додати IndexedDB fallback
4. Протестувати background notifications

### Phase 4: Update Webhook API
1. Видалити код збереження в БД з webhook
2. Залишити тільки FCM send
3. Оновити response format
4. Протестувати повний flow

### Phase 5: Cleanup
1. Видалити невикористаний код
2. Оновити документацію
3. Провести повне тестування

## Performance Considerations

### 1. Reduce Database Writes
- Webhook більше не пише в БД (швидше)
- Збереження відбувається асинхронно на клієнті

### 2. Improve User Experience
- Користувач бачить notification швидше
- UI оновлюється без затримок
- Offline support через IndexedDB

### 3. Better Error Recovery
- Retry logic на клієнті
- Fallback storage в SW
- Graceful degradation

## Security Considerations

### 1. Authentication
- Save API перевіряє cookie для username
- Webhook API приймає username в body або cookie
- Валідація всіх вхідних даних

### 2. Rate Limiting
- Обмеження кількості save requests на користувача
- Захист від spam через FCM

### 3. Data Validation
- Sanitize notification_title
- Validate fcm_message_id format
- Check timestamp validity

## Monitoring and Logging

### Key Metrics
- FCM delivery success rate
- Database save success rate
- Average time from FCM to DB save
- Retry attempts count
- Failed notifications count

### Logging Points
1. Webhook receives request
2. FCM send success/failure
3. Client receives FCM
4. Save API called
5. Database save success/failure
6. Retry attempts
7. Fallback storage used
