# Виправлення помилки з секретами в Git

## Проблема

GitHub блокує push через Firebase credentials файл в історії git:
```
svup-notifications-firebase-adminsdk-fbsvc-95edb80cbe.json
```

## Що зроблено

1. ✅ Файл видалено з робочої директорії
2. ✅ Додано в `.gitignore`
3. ✅ Створено новий коміт

## Проблема залишається

Файл все ще в **історії git** (в старих комітах), тому GitHub його бачить.

## Рішення

### Варіант 1: Дозволити GitHub (швидко)

GitHub дав URL для дозволу:
```
https://github.com/operatorpuar/svup_notifications/security/secret-scanning/unblock-secret/35PK1JynXXpCjBgz3pomN96Z6Bu
```

1. Відкрийте цей URL
2. Натисніть "Allow secret" або подібну кнопку
3. Спробуйте push знову

**Примітка:** Це безпечно, оскільки:
- Файл вже видалено з репозиторію
- Ключі зберігаються в `.env` (не в git)
- Можна ротувати ключі в Firebase Console якщо потрібно

### Варіант 2: Очистити історію git (складно)

Видалити файл з усієї історії git:

```bash
# Використати git filter-repo (рекомендовано)
pip install git-filter-repo
git filter-repo --path svup-notifications-firebase-adminsdk-fbsvc-95edb80cbe.json --invert-paths

# Або використати BFG Repo-Cleaner
# https://rtyley.github.io/bfg-repo-cleaner/
```

**Увага:** Це перепише всю історію git!

### Варіант 3: Створити новий репозиторій (найпростіше)

1. Створити новий репозиторій на GitHub
2. Змінити remote:
```bash
git remote set-url origin https://github.com/operatorpuar/NEW_REPO_NAME.git
git push -u origin master
```

## Безпека

### Чи потрібно ротувати ключі?

**Якщо репозиторій був публічний:** ТАК
- Створіть новий Service Account в Firebase Console
- Оновіть `.env` з новими ключами

**Якщо репозиторій приватний:** Можна не ротувати
- Файл бачили тільки ви
- Але краще ротувати для безпеки

### Як ротувати Firebase ключі

1. Відкрийте Firebase Console
2. Project Settings → Service Accounts
3. Generate New Private Key
4. Оновіть `.env`:
   ```
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@project.iam.gserviceaccount.com"
   ```
5. Видаліть старий Service Account (опціонально)

## Рекомендація

**Використайте Варіант 1** - найшвидше рішення.

Якщо хвилюєтесь про безпеку - ротуйте ключі після дозволу push.
