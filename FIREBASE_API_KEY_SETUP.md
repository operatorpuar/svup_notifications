# Як знайти Firebase API Key

## Проблема

Помилка: `API key not valid. Please pass a valid API key`

Це означає, що `PUBLIC_FIREBASE_API_KEY` в `.env` файлі містить неправильний ключ.

## Різниця між ключами

У Firebase є **два різні ключі**:

1. **API Key** (apiKey) - використовується для ідентифікації Firebase проекту
   - Формат: `AIzaSy...` (починається з AIza)
   - Приклад: `AIzaSyDOCAbC123dEf456GhI789jKl012-MnO`

2. **VAPID Key** (vapidKey) - використовується тільки для Web Push сповіщень
   - Формат: Base64 строка
   - Приклад: `BGU6HXc8S6g-5Ifkl7OQLoG50_jdjoNprtNptbdd5ZO...`

## Як знайти правильний API Key

### Крок 1: Відкрийте Firebase Console
1. Перейдіть на https://console.firebase.google.com/
2. Виберіть проект `svup-notifications`

### Крок 2: Знайдіть Web App конфігурацію
1. Натисніть на іконку ⚙️ (Settings) зліва внизу
2. Виберіть **Project settings**
3. Прокрутіть вниз до секції **Your apps**
4. Знайдіть вашу Web app (з іконкою `</>`

### Крок 3: Скопіюйте API Key
1. Натисніть на **SDK setup and configuration**
2. Виберіть **Config** (не npm)
3. Ви побачите JavaScript об'єкт:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",  // ← ЦЕЙ ключ потрібен!
  authDomain: "svup-notifications.firebaseapp.com",
  projectId: "svup-notifications",
  storageBucket: "svup-notifications.firebasestorage.app",
  messagingSenderId: "1045455308957",
  appId: "1:1045455308957:web:8798c07a9ef087e9f8ac74"
};
```

4. Скопіюйте значення `apiKey`

### Крок 4: Оновіть .env файл
Замініть `YOUR_FIREBASE_API_KEY_HERE` на скопійований ключ:

```env
PUBLIC_FIREBASE_API_KEY=AIzaSy...ваш_ключ_тут
```

### Крок 5: Перезапустіть dev server
```bash
# Зупиніть поточний сервер (Ctrl+C)
npm run dev
```

## Перевірка

Після перезапуску відкрийте консоль браузера. Ви повинні побачити:
- ✅ `Service Worker registered`
- ✅ `Notification permission granted` (якщо дозволили)
- ✅ `FCM Token retrieved: ...`

Замість помилки `API key not valid`.

## Альтернативний спосіб

Якщо не можете знайти в консолі, можна створити новий Web App:

1. Firebase Console → Project Settings
2. Прокрутіть до **Your apps**
3. Натисніть **Add app** → Виберіть Web (`</>`)
4. Введіть назву (наприклад, "Web App")
5. Скопіюйте конфігурацію

## Безпека

⚠️ **API Key можна безпечно використовувати в клієнтському коді** - він призначений для публічного використання. Безпека забезпечується через Firebase Security Rules, а не через приховування ключа.
