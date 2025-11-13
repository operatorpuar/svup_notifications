# Requirements Document

## Introduction

SVUP Notifications App - це мобільно-орієнтований веб-додаток для системи сповіщень СВУП, побудований на Astro з інтеграцією Firebase Cloud Messaging. Додаток забезпечує безпечну автентифікацію користувачів через TOTP та управління push-сповіщеннями в реальному часі.

## Glossary

- **SVUP System**: Система СВУП - основна платформа, з якою інтегрується додаток
- **Notification App**: Веб-додаток для отримання та перегляду сповіщень
- **FCM**: Firebase Cloud Messaging - сервіс для доставки push-сповіщень
- **TOTP**: Time-based One-Time Password - одноразовий пароль на основі часу
- **JWT Token**: JSON Web Token для автентифікації користувача
- **Turso Database**: База даних для зберігання FCM токенів та сповіщень
- **Backend API**: Зовнішній API за адресою https://firebackend-6c859a037589.herokuapp.com/api

## Requirements

### Requirement 1: User Authentication

**User Story:** Як користувач СВУП, я хочу увійти в систему сповіщень використовуючи мої облікові дані та TOTP код, щоб отримати безпечний доступ до моїх сповіщень

#### Acceptance Criteria

1. THE Notification App SHALL display a login page with dark background color #1E293B, centered chevron logo, "Вхід в систему" title, and input fields for username, password, and TOTP code
2. WHEN the user submits valid credentials (username, password, TOTP code), THE Notification App SHALL send a POST request to /allauth/login/ endpoint with Content-Type application/json header
3. WHEN the Backend API returns status 200 with access_token and user object, THE Notification App SHALL store the JWT token and redirect the user to the notifications page
4. WHEN the Backend API returns status 401 with error "Невірний username або password", THE Notification App SHALL display an error message to the user
5. WHEN the Backend API returns status 401 with error "Невірний TOTP код", THE Notification App SHALL display a TOTP-specific error message to the user
6. WHEN the Backend API returns status 401 with error "Token blacklisted", THE Notification App SHALL display a session expired message and require re-authentication
7. THE Notification App SHALL validate that all three fields (username, password, TOTP code) are filled before enabling the submit button

### Requirement 2: Session Management

**User Story:** Як автентифікований користувач, я хочу мати можливість вийти з системи, щоб завершити свою сесію та захистити свій обліковий запис

#### Acceptance Criteria

1. THE Notification App SHALL include a logout button in the header of the notifications page
2. WHEN the user clicks the logout button, THE Notification App SHALL send a POST request to /auth/logout-all/ endpoint with Authorization header containing Bearer JWT token
3. WHEN the logout request completes successfully, THE Notification App SHALL clear the stored JWT token and redirect the user to the login page
4. WHEN the JWT token expires after 24 hours, THE Notification App SHALL automatically redirect the user to the login page on the next API request
5. THE Notification App SHALL include the Authorization Bearer token in all API requests except the login endpoint

### Requirement 3: Notifications Display

**User Story:** Як автентифікований користувач, я хочу бачити список моїх сповіщень з їх статусом та часом отримання, щоб бути в курсі важливих подій

#### Acceptance Criteria

1. THE Notification App SHALL display a header containing the SVUP chevron logo, "СВУП" text, an update check button, and a logout button
2. THE Notification App SHALL display a "Сповіщення (n)" heading where n represents the total count of notifications
3. THE Notification App SHALL display a "Всі прочитані" button below the notifications heading
4. THE Notification App SHALL render each notification in a container showing notification description, timestamp in dd.mm.yy hh:mm format, and a "Нове" badge for unread notifications
5. THE Notification App SHALL retrieve notifications from the Turso Database where each notification contains fields for username, notification_title, timestamp, and read status (New or Read)
6. THE Notification App SHALL display notifications in reverse chronological order with newest notifications first
7. WHEN a notification has read status "Read", THE Notification App SHALL hide the "Нове" badge for that notification

### Requirement 4: Mark Notifications as Read

**User Story:** Як користувач, я хочу позначати сповіщення як прочитані, щоб відстежувати які повідомлення я вже переглянув

#### Acceptance Criteria

1. WHEN the user clicks on a notification container, THE Notification App SHALL update that notification's status from "New" to "Read" in the Turso Database
2. WHEN the user clicks the "Всі прочитані" button, THE Notification App SHALL update all notifications with status "New" to "Read" for the current user in the Turso Database
3. WHEN a notification status changes to "Read", THE Notification App SHALL immediately remove the "Нове" badge from the notification display
4. WHEN all notifications are marked as read, THE Notification App SHALL update the notification count (n) in the "Сповіщення (n)" heading

### Requirement 5: Firebase Cloud Messaging Integration

**User Story:** Як користувач, я хочу отримувати push-сповіщення в реальному часі, щоб бути негайно поінформованим про важливі події

#### Acceptance Criteria

1. THE Notification App SHALL initialize Firebase Cloud Messaging SDK on the client side after successful user authentication
2. WHEN FCM initialization completes, THE Notification App SHALL request notification permission from the user's browser
3. WHEN the user grants notification permission, THE Notification App SHALL retrieve the FCM registration token
4. WHEN the FCM token is retrieved, THE Notification App SHALL store the mapping of username to FCM token in the Turso Database
5. WHEN a new FCM message arrives while the app is in foreground, THE Notification App SHALL display the notification in the notifications list and increment the notification count
6. WHEN a new FCM message arrives while the app is in background, THE Notification App SHALL display a browser push notification
7. THE Notification App SHALL configure a service worker to handle background FCM messages

### Requirement 6: Notification Webhook Endpoint

**User Story:** Як зовнішня система, я хочу надсилати сповіщення користувачам через webhook, щоб доставляти повідомлення в додаток

#### Acceptance Criteria

1. THE Notification App SHALL expose a POST endpoint at /api/notifications/webhook for receiving notification webhooks
2. WHEN a POST request arrives at the webhook endpoint with body containing username and notification_title, THE Notification App SHALL validate that both fields are present
3. WHEN the webhook receives valid data, THE Notification App SHALL create a new notification record in the Turso Database with username, notification_title, current timestamp, and status "New"
4. WHEN a new notification is stored in the database, THE Notification App SHALL retrieve the FCM token for the specified username from the Turso Database
5. WHEN the FCM token exists for the user, THE Notification App SHALL send a push notification via Firebase Admin SDK to that FCM token with the notification_title as the message body
6. WHEN the webhook request is processed successfully, THE Notification App SHALL return HTTP status 200 with a success message
7. WHEN the webhook request contains invalid data or the user is not found, THE Notification App SHALL return HTTP status 400 with an error message

### Requirement 7: Database Schema

**User Story:** Як система, я потребую структуровану базу даних для зберігання FCM токенів та сповіщень, щоб забезпечити надійне зберігання даних

#### Acceptance Criteria

1. THE Turso Database SHALL contain a table "fcm_tokens" with columns: id (primary key), username (unique, text), fcm_token (text), created_at (timestamp), updated_at (timestamp)
2. THE Turso Database SHALL contain a table "notifications" with columns: id (primary key), username (text), notification_title (text), status (text with values "New" or "Read"), created_at (timestamp)
3. WHEN a user logs in and provides a new FCM token, THE Notification App SHALL update the existing fcm_token record if username exists, or insert a new record if username does not exist
4. THE Notification App SHALL create an index on the username column in both tables for efficient query performance
5. THE Notification App SHALL create an index on the created_at column in the notifications table for efficient sorting

### Requirement 8: App Update Check

**User Story:** Як користувач, я хочу перевіряти наявність оновлень додатку, щоб використовувати найновішу версію

#### Acceptance Criteria

1. THE Notification App SHALL display an update check button in the header of the notifications page
2. WHEN the user clicks the update check button, THE Notification App SHALL check for service worker updates
3. WHEN a new version is available, THE Notification App SHALL display a message prompting the user to reload the application
4. WHEN the user confirms the reload, THE Notification App SHALL update the service worker and reload the page
5. WHEN no updates are available, THE Notification App SHALL display a message indicating the app is up to date
