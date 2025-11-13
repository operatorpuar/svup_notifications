# Design Document

## Overview

SVUP Notifications App - це веб-додаток побудований на Astro 5 з SSR (Server-Side Rendering) через Netlify adapter. Додаток інтегрується з зовнішнім Backend API для автентифікації та використовує Firebase Cloud Messaging для доставки push-сповіщень в реальному часі. Turso Database (libSQL) зберігає FCM токени користувачів та історію сповіщень.

### Technology Stack

- **Frontend Framework**: Astro 5.15.5 з SSR режимом
- **Styling**: Tailwind CSS 4.1.17
- **Database**: Astro DB з Turso backend (libSQL на AWS US-East-2)
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Deployment**: Netlify з @astrojs/netlify adapter
- **Authentication**: JWT tokens від зовнішнього Backend API

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   User Browser  │
│  (Client Side)  │
└────────┬────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────┐              ┌──────────────────┐
│  Astro Pages    │              │  Service Worker  │
│  - Login        │              │  (FCM Handler)   │
│  - Notifications│              └──────────────────┘
└────────┬────────┘                        │
         │                                  │
         ├──────────────────────────────────┤
         │                                  │
         ▼                                  ▼
┌─────────────────────────────────────────────┐
│         Astro API Endpoints (SSR)           │
│  - /api/auth/login                          │
│  - /api/auth/logout                         │
│  - /api/notifications/webhook               │
│  - /api/fcm/register-token                  │
│  - /api/notifications/list                  │
│  - /api/notifications/mark-read             │
└────────┬────────────────────────────────────┘
         │
         ├──────────────────┬─────────────────┐
         │                  │                 │
         ▼                  ▼                 ▼
┌─────────────┐   ┌──────────────┐   ┌──────────────┐
│ Backend API │   │  Turso DB    │   │ Firebase FCM │
│ (External)  │   │  (Astro DB)  │   │   Admin SDK  │
└─────────────┘   └──────────────┘   └──────────────┘
```

### Data Flow

#### Authentication Flow
1. User submits credentials (username, password, TOTP) → Login page
2. Login page → POST /api/auth/login → External Backend API
3. Backend API returns JWT token + user data
4. Store JWT in session/cookie → Redirect to notifications page

#### Notification Reception Flow
1. External system → POST /api/notifications/webhook (username, notification_title)
2. Webhook endpoint stores notification in Turso DB
3. Webhook retrieves FCM token for username from Turso DB
4. Webhook sends push notification via Firebase Admin SDK
5. Client receives push notification (foreground or background)
6. Client updates UI with new notification

#### FCM Token Registration Flow
1. User logs in successfully
2. Client initializes Firebase SDK
3. Client requests notification permission
4. Client retrieves FCM token
5. Client → POST /api/fcm/register-token (username, fcm_token)
6. API stores/updates FCM token in Turso DB

## Components and Interfaces

### 1. Pages (Astro Components)

#### `/src/pages/index.astro` - Login Page

**Purpose**: Автентифікація користувача з TOTP

**UI Elements**:
- Background: #1E293B
- Centered chevron logo
- Title: "Вхід в систему"
- Form fields:
  - Username (text input)
  - Password (password input)
  - TOTP Code (number input, 6 digits)
- Submit button (disabled until all fields filled)
- Error message display area

**Client-Side Logic**:
```typescript
// Form validation
const validateForm = () => {
  return username && password && totpCode.length === 6;
};

// Form submission
const handleLogin = async (e: Event) => {
  e.preventDefault();
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, totp_code: totpCode })
  });
  
  if (response.ok) {
    window.location.href = '/notifications';
  } else {
    const error = await response.json();
    displayError(error.message);
  }
};
```

#### `/src/pages/notifications.astro` - Notifications Page

**Purpose**: Відображення списку сповіщень користувача

**UI Elements**:
- Header:
  - SVUP chevron logo + "СВУП" text
  - Update check button
  - Logout button
- Notifications section:
  - "Сповіщення (n)" heading
  - "Всі прочитані" button
  - Notification containers (list):
    - Notification title/description
    - Timestamp (dd.mm.yy hh:mm)
    - "Нове" badge (conditional)

**Server-Side Logic** (Astro frontmatter):
```typescript
// Check authentication
const token = Astro.cookies.get('jwt_token')?.value;
if (!token) {
  return Astro.redirect('/');
}

// Fetch notifications from database
import { db, Notification } from 'astro:db';
const username = Astro.cookies.get('username')?.value;
const notifications = await db
  .select()
  .from(Notification)
  .where(eq(Notification.username, username))
  .orderBy(desc(Notification.created_at));
```

**Client-Side Logic**:
```typescript
// Initialize FCM on page load
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const initFCM = async () => {
  const messaging = getMessaging(firebaseApp);
  
  // Request permission
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    await registerFCMToken(token);
  }
  
  // Listen for foreground messages
  onMessage(messaging, (payload) => {
    addNotificationToUI(payload);
  });
};

// Mark notification as read
const markAsRead = async (notificationId: number) => {
  await fetch('/api/notifications/mark-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: notificationId })
  });
  updateUIBadge(notificationId);
};

// Mark all as read
const markAllAsRead = async () => {
  await fetch('/api/notifications/mark-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ all: true })
  });
  updateAllUIBadges();
};
```

### 2. API Endpoints (Server-Side)

#### `/src/pages/api/auth/login.ts`

**Purpose**: Проксі для автентифікації через зовнішній Backend API

```typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { username, password, totp_code } = await request.json();
  
  // Validate input
  if (!username || !password || !totp_code) {
    return new Response(
      JSON.stringify({ error: 'Всі поля обов\'язкові' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Call external API
  const response = await fetch(
    'https://firebackend-6c859a037589.herokuapp.com/api/allauth/login/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, totp_code })
    }
  );
  
  if (response.ok) {
    const data = await response.json();
    
    // Store JWT token in HTTP-only cookie
    cookies.set('jwt_token', data.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 86400, // 24 hours
      path: '/'
    });
    
    // Store username for database queries
    cookies.set('username', username, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 86400,
      path: '/'
    });
    
    return new Response(
      JSON.stringify({ success: true, user: data.user }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } else {
    const error = await response.json();
    return new Response(
      JSON.stringify({ error: error.error || 'Помилка автентифікації' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

#### `/src/pages/api/auth/logout.ts`

**Purpose**: Вихід користувача з системи

```typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('jwt_token')?.value;
  
  if (token) {
    // Call external logout endpoint
    try {
      await fetch(
        'https://firebackend-6c859a037589.herokuapp.com/api/auth/logout-all/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
    } catch (error) {
      console.error('Logout API error:', error);
    }
  }
  
  // Clear cookies
  cookies.delete('jwt_token', { path: '/' });
  cookies.delete('username', { path: '/' });
  
  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

#### `/src/pages/api/fcm/register-token.ts`

**Purpose**: Реєстрація FCM токену користувача

```typescript
import type { APIRoute } from 'astro';
import { db, FCMToken, eq } from 'astro:db';

export const POST: APIRoute = async ({ request, cookies }) => {
  const username = cookies.get('username')?.value;
  
  if (!username) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const { fcm_token } = await request.json();
  
  if (!fcm_token) {
    return new Response(
      JSON.stringify({ error: 'FCM token required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Upsert FCM token
  const existing = await db
    .select()
    .from(FCMToken)
    .where(eq(FCMToken.username, username))
    .get();
  
  if (existing) {
    await db
      .update(FCMToken)
      .set({ 
        fcm_token,
        updated_at: new Date()
      })
      .where(eq(FCMToken.username, username));
  } else {
    await db.insert(FCMToken).values({
      username,
      fcm_token,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

#### `/src/pages/api/notifications/webhook.ts`

**Purpose**: Прийом сповіщень від зовнішніх систем

```typescript
import type { APIRoute } from 'astro';
import { db, Notification, FCMToken, eq } from 'astro:db';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin SDK
const firebaseAdmin = initializeApp({
  credential: cert({
    projectId: import.meta.env.FIREBASE_PROJECT_ID,
    clientEmail: import.meta.env.FIREBASE_CLIENT_EMAIL,
    privateKey: import.meta.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

export const POST: APIRoute = async ({ request }) => {
  const { username, notification_title } = await request.json();
  
  // Validate input
  if (!username || !notification_title) {
    return new Response(
      JSON.stringify({ error: 'username and notification_title required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Store notification in database
  const notification = await db.insert(Notification).values({
    username,
    notification_title,
    status: 'New',
    created_at: new Date()
  }).returning();
  
  // Get FCM token for user
  const fcmRecord = await db
    .select()
    .from(FCMToken)
    .where(eq(FCMToken.username, username))
    .get();
  
  if (fcmRecord?.fcm_token) {
    // Send push notification via FCM
    try {
      const messaging = getMessaging(firebaseAdmin);
      await messaging.send({
        token: fcmRecord.fcm_token,
        notification: {
          title: 'СВУП',
          body: notification_title
        },
        data: {
          notificationId: notification[0].id.toString(),
          timestamp: notification[0].created_at.toISOString()
        }
      });
    } catch (error) {
      console.error('FCM send error:', error);
      // Don't fail the webhook if FCM fails
    }
  }
  
  return new Response(
    JSON.stringify({ success: true, notification: notification[0] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

#### `/src/pages/api/notifications/mark-read.ts`

**Purpose**: Позначення сповіщень як прочитаних

```typescript
import type { APIRoute } from 'astro';
import { db, Notification, eq } from 'astro:db';

export const POST: APIRoute = async ({ request, cookies }) => {
  const username = cookies.get('username')?.value;
  
  if (!username) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const { id, all } = await request.json();
  
  if (all) {
    // Mark all notifications as read
    await db
      .update(Notification)
      .set({ status: 'Read' })
      .where(eq(Notification.username, username));
  } else if (id) {
    // Mark specific notification as read
    await db
      .update(Notification)
      .set({ status: 'Read' })
      .where(eq(Notification.id, id));
  } else {
    return new Response(
      JSON.stringify({ error: 'id or all parameter required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

### 3. Service Worker

#### `/public/firebase-messaging-sw.js`

**Purpose**: Обробка background push-сповіщень

```javascript
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.data
  };
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/notifications')
  );
});
```

### 4. Utility Modules

#### `/src/lib/firebase-client.ts`

**Purpose**: Firebase клієнтська конфігурація

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
};

export const firebaseApp = initializeApp(firebaseConfig);
export const messaging = getMessaging(firebaseApp);

export const VAPID_KEY = import.meta.env.PUBLIC_FIREBASE_VAPID_KEY;
```

#### `/src/lib/auth-middleware.ts`

**Purpose**: Middleware для перевірки автентифікації

```typescript
import type { AstroCookies } from 'astro';

export function requireAuth(cookies: AstroCookies): string | null {
  const token = cookies.get('jwt_token')?.value;
  const username = cookies.get('username')?.value;
  
  if (!token || !username) {
    return null;
  }
  
  return username;
}
```

## Data Models

### Turso Database Schema

#### Table: `fcm_tokens`

```typescript
import { defineTable, column } from 'astro:db';

export const FCMToken = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    username: column.text({ unique: true }),
    fcm_token: column.text(),
    created_at: column.date(),
    updated_at: column.date()
  },
  indexes: {
    username_idx: { on: ['username'], unique: true }
  }
});
```

**Purpose**: Зберігання FCM токенів користувачів для відправки push-сповіщень

**Fields**:
- `id`: Унікальний ідентифікатор запису
- `username`: Ім'я користувача (унікальне)
- `fcm_token`: Firebase Cloud Messaging токен
- `created_at`: Дата створення запису
- `updated_at`: Дата останнього оновлення

#### Table: `notifications`

```typescript
export const Notification = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    username: column.text(),
    notification_title: column.text(),
    status: column.text(), // 'New' or 'Read'
    created_at: column.date()
  },
  indexes: {
    username_idx: { on: ['username'] },
    created_at_idx: { on: ['created_at'] },
    status_idx: { on: ['status'] }
  }
});
```

**Purpose**: Зберігання історії сповіщень користувачів

**Fields**:
- `id`: Унікальний ідентифікатор сповіщення
- `username`: Ім'я користувача-отримувача
- `notification_title`: Текст сповіщення
- `status`: Статус сповіщення ('New' або 'Read')
- `created_at`: Дата та час створення сповіщення

### External API Data Models

#### Login Request
```typescript
interface LoginRequest {
  username: string;
  password: string;
  totp_code: number;
}
```

#### Login Response (Success)
```typescript
interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}
```

#### Login Response (Error)
```typescript
interface LoginError {
  error: string; // "Token blacklisted" | "Невірний TOTP код" | "Невірний username або password"
  valid?: boolean;
}
```

#### Webhook Request
```typescript
interface WebhookRequest {
  username: string;
  notification_title: string;
}
```

## Error Handling

### Authentication Errors

1. **Invalid Credentials**
   - Display: "Невірний username або password"
   - Action: Allow user to retry

2. **Invalid TOTP Code**
   - Display: "Невірний TOTP код"
   - Action: Allow user to retry

3. **Token Blacklisted**
   - Display: "Сесія закінчилась. Будь ласка, увійдіть знову"
   - Action: Clear cookies, redirect to login

4. **Network Error**
   - Display: "Помилка з'єднання. Спробуйте пізніше"
   - Action: Allow user to retry

### FCM Errors

1. **Permission Denied**
   - Display: "Дозвіл на сповіщення відхилено"
   - Action: Show instructions to enable in browser settings

2. **Token Registration Failed**
   - Log error silently
   - Action: Retry on next page load

3. **Message Send Failed (Server)**
   - Log error
   - Action: Notification still saved in DB, user can see it in app

### Database Errors

1. **Connection Failed**
   - Display: "Помилка бази даних"
   - Action: Retry operation, log error

2. **Query Failed**
   - Log error with context
   - Action: Return appropriate HTTP error code

### Webhook Errors

1. **Invalid Payload**
   - Return: 400 Bad Request
   - Response: `{ error: "username and notification_title required" }`

2. **User Not Found**
   - Store notification anyway
   - Log warning
   - Return: 200 OK (notification saved)

## Testing Strategy

### Unit Tests

1. **API Endpoints**
   - Test authentication flow with valid/invalid credentials
   - Test FCM token registration and updates
   - Test notification creation and status updates
   - Test webhook payload validation

2. **Utility Functions**
   - Test date formatting (dd.mm.yy hh:mm)
   - Test auth middleware token validation

### Integration Tests

1. **Authentication Flow**
   - Complete login → store token → access protected page
   - Logout → clear cookies → redirect to login

2. **Notification Flow**
   - Webhook receives notification → stores in DB → sends FCM
   - User receives notification → marks as read → UI updates

3. **FCM Integration**
   - Register token → store in DB → send test notification
   - Foreground message handling
   - Background message handling via service worker

### Manual Testing

1. **UI/UX Testing**
   - Login form validation and error messages
   - Notifications list display and sorting
   - "Нове" badge visibility
   - Mark as read functionality
   - Responsive design on mobile devices

2. **Browser Compatibility**
   - Test on Chrome, Firefox, Safari, Edge
   - Test service worker registration
   - Test notification permissions

3. **End-to-End Scenarios**
   - User logs in → receives notification → marks as read → logs out
   - Multiple notifications → mark all as read
   - Background notification → click → opens app

## Security Considerations

1. **JWT Token Storage**
   - Store in HTTP-only cookies (not localStorage)
   - Set Secure and SameSite flags
   - 24-hour expiration

2. **API Authentication**
   - All protected endpoints check for valid JWT
   - Webhook endpoint should validate request source (optional: API key)

3. **Environment Variables**
   - Store Firebase credentials in .env
   - Never commit .env to version control
   - Use Netlify environment variables for production

4. **Input Validation**
   - Validate all user inputs on server-side
   - Sanitize notification titles before display
   - Validate TOTP code format (6 digits)

5. **CORS Configuration**
   - Restrict webhook endpoint to known sources
   - Configure appropriate CORS headers

## Performance Considerations

1. **Database Queries**
   - Index on username, created_at, status columns
   - Limit notification list to recent items (e.g., last 100)
   - Implement pagination if needed

2. **FCM Token Management**
   - Update token only when changed
   - Clean up expired tokens periodically

3. **Service Worker**
   - Cache static assets
   - Implement update check mechanism
   - Handle service worker updates gracefully

4. **API Response Times**
   - External API calls should timeout after 10 seconds
   - Implement retry logic for failed requests
   - Use connection pooling for database

## Deployment Configuration

### Environment Variables

```bash
# External Backend API
BACKEND_API_URL=https://firebackend-6c859a037589.herokuapp.com/api

# Astro DB (Turso)
ASTRO_DB_REMOTE_URL=<turso-db-url>
ASTRO_DB_APP_TOKEN=<turso-token>

# Firebase Client (Public)
PUBLIC_FIREBASE_API_KEY=<api-key>
PUBLIC_FIREBASE_AUTH_DOMAIN=<auth-domain>
PUBLIC_FIREBASE_PROJECT_ID=<project-id>
PUBLIC_FIREBASE_STORAGE_BUCKET=<storage-bucket>
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
PUBLIC_FIREBASE_APP_ID=<app-id>
PUBLIC_FIREBASE_VAPID_KEY=<vapid-key>

# Firebase Admin (Server)
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_CLIENT_EMAIL=<client-email>
FIREBASE_PRIVATE_KEY=<private-key>
```

### Netlify Configuration

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/firebase-messaging-sw.js"
  [headers.values]
    Service-Worker-Allowed = "/"
    Cache-Control = "no-cache"
```

## Future Enhancements

1. **Notification Categories**
   - Add category field to notifications
   - Filter notifications by category

2. **Rich Notifications**
   - Support images in notifications
   - Add action buttons to notifications

3. **Notification History**
   - Archive old notifications
   - Search functionality

4. **User Preferences**
   - Notification sound settings
   - Do not disturb mode
   - Notification frequency settings

5. **Analytics**
   - Track notification delivery rates
   - Monitor user engagement
   - FCM token refresh rates
