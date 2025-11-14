# Requirements Document

## Introduction

Цей документ описує вимоги для виправлення потоку прийому та збереження push-сповіщень у додатку svup_notifications. Згідно з офіційною документацією Firebase Cloud Messaging (FCM), push-сповіщення повинні спочатку приходити до браузера користувача, а потім зберігатися в базі даних. Поточна реалізація працює навпаки - спочатку зберігає в БД, потім відправляє push, що не відповідає best practices FCM.

## Glossary

- **FCM (Firebase Cloud Messaging)**: Сервіс Google для надсилання push-сповіщень на веб та мобільні пристрої
- **Service Worker**: Фоновий скрипт браузера, який обробляє push-сповіщення навіть коли додаток закритий
- **Foreground Message**: Сповіщення, отримане коли додаток відкритий та активний
- **Background Message**: Сповіщення, отримане коли додаток закритий або неактивний
- **Notification System**: Система обробки та збереження сповіщень у додатку
- **Webhook API**: Серверний endpoint для прийому запитів на створення сповіщень
- **Client-side Handler**: Клієнтський код, який обробляє отримані FCM повідомлення

## Requirements

### Requirement 1

**User Story:** Як користувач, я хочу отримувати push-сповіщення в браузері негайно після їх відправки, щоб бути в курсі важливих подій в реальному часі

#### Acceptance Criteria

1. WHEN зовнішня система відправляє запит на webhook API, THE Notification System SHALL відправити FCM push-сповіщення до браузера користувача
2. WHEN FCM push-сповіщення відправлено успішно, THE Notification System SHALL зберегти сповіщення в базі даних
3. WHEN додаток відкритий (foreground), THE Client-side Handler SHALL отримати сповіщення через onMessage callback
4. WHEN додаток закритий (background), THE Service Worker SHALL отримати сповіщення через onBackgroundMessage callback
5. THE Notification System SHALL відправити FCM сповіщення до збереження в базі даних

### Requirement 2

**User Story:** Як користувач, я хочу бачити всі отримані сповіщення в списку, навіть якщо я їх пропустив, щоб не втратити важливу інформацію

#### Acceptance Criteria

1. WHEN FCM сповіщення успішно доставлено до клієнта, THE Client-side Handler SHALL відправити запит на збереження сповіщення в базі даних
2. WHEN запит на збереження отримано, THE Notification System SHALL створити новий запис у таблиці Notification зі статусом "New"
3. WHEN сповіщення збережено в базі даних, THE Notification System SHALL повернути успішну відповідь з ID створеного сповіщення
4. IF збереження в базі даних не вдалося, THE Client-side Handler SHALL повторити спробу збереження максимум 2 рази
5. THE Notification System SHALL зберігати username, notification_title, status та created_at для кожного сповіщення

### Requirement 3

**User Story:** Як користувач, я хочу бачити оновлений список сповіщень без перезагрузки сторінки, щоб мати актуальну інформацію

#### Acceptance Criteria

1. WHEN нове сповіщення збережено в базі даних, THE Client-side Handler SHALL оновити UI додавши нове сповіщення до списку
2. WHEN список сповіщень оновлюється, THE Client-side Handler SHALL оновити лічильник непрочитаних сповіщень
3. THE Client-side Handler SHALL додавати нові сповіщення на початок списку (зверху)
4. THE Client-side Handler SHALL зберігати поточну позицію прокрутки при оновленні списку
5. WHEN оновлення UI завершено, THE Client-side Handler SHALL показати toast-повідомлення про отримання нового сповіщення

### Requirement 4

**User Story:** Як розробник, я хочу мати надійний механізм обробки помилок, щоб система продовжувала працювати навіть при збоях

#### Acceptance Criteria

1. IF FCM токен користувача не знайдено, THE Webhook API SHALL зберегти сповіщення в базі даних без відправки push
2. IF відправка FCM сповіщення не вдалася, THE Webhook API SHALL зберегти сповіщення в базі даних та залогувати помилку
3. IF збереження в базі даних не вдалося після відправки FCM, THE Client-side Handler SHALL повторити збереження при наступному запиті
4. THE Notification System SHALL логувати всі критичні помилки з деталями для debugging
5. THE Notification System SHALL повертати зрозумілі повідомлення про помилки у відповідях API

### Requirement 5

**User Story:** Як користувач, я хочу отримувати сповіщення навіть коли додаток закритий, щоб не пропустити важливі події

#### Acceptance Criteria

1. WHEN додаток закритий або неактивний, THE Service Worker SHALL обробити вхідне FCM сповіщення
2. WHEN Service Worker отримує сповіщення, THE Service Worker SHALL показати системне сповіщення браузера
3. WHEN користувач клікає на системне сповіщення, THE Service Worker SHALL відкрити сторінку /notifications
4. WHEN додаток відкривається після кліку на сповіщення, THE Client-side Handler SHALL завантажити оновлений список сповіщень
5. THE Service Worker SHALL зберігати дані сповіщення (notificationId, timestamp) для подальшої обробки
