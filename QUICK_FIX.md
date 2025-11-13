# Швидке виправлення Git Secret

## Проблема
GitHub блокує push через секрет в коміті `1559dd4`

## Найшвидше рішення (РЕКОМЕНДОВАНО)

### Крок 1: Дозвольте через GitHub
Відкрийте цей URL в браузері:
```
https://github.com/operatorpuar/svup_notifications/security/secret-scanning/unblock-secret/35PK1JynXXpCjBgz3pomN96Z6Bu
```

Натисніть кнопку "Allow" або "I'll fix it later"

### Крок 2: Push знову
```bash
git push
```

Готово! ✅

---

## Альтернатива: Очистити історію (якщо не спрацювало)

### Варіант A: Використати git filter-repo

```bash
# Встановити git-filter-repo
pip install git-filter-repo

# Видалити файл з історії
git filter-repo --path svup-notifications-firebase-adminsdk-fbsvc-95edb80cbe.json --invert-paths

# Force push
git push --force
```

### Варіант B: Створити новий початковий коміт

```bash
# Створити нову гілку без історії
git checkout --orphan new-master

# Додати всі файли
git add .

# Створити новий початковий коміт
git commit -m "Initial commit - clean history"

# Видалити стару гілку
git branch -D master

# Перейменувати нову гілку
git branch -m master

# Force push
git push -f origin master
```

### Варіант C: Інтерактивний rebase

```bash
# Rebase останніх 3 комітів
git rebase -i HEAD~3

# В редакторі змініть 'pick' на 'edit' для коміту 1559dd4
# Збережіть і закрийте

# Видаліть файл
git rm svup-notifications-firebase-adminsdk-fbsvc-95edb80cbe.json

# Продовжте rebase
git rebase --continue

# Force push
git push --force
```

## Після виправлення

### Перевірте що файл видалено
```bash
git log --all --full-history -- "*firebase-adminsdk*.json"
```

Якщо команда нічого не показує - файл успішно видалено з історії.

### Ротуйте ключі (рекомендовано)
1. Firebase Console → Project Settings → Service Accounts
2. Generate New Private Key
3. Оновіть `.env`
4. Видаліть старий Service Account

## Примітка
Файл вже в `.gitignore`, тому більше не потрапить в git.
