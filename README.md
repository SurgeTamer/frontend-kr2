# КР2 — Магазин парфюмерии

Веб-приложение интернет-магазина парфюмерии: каталог товаров с CRUD-операциями, аутентификация (bcrypt, JWT, refresh-токены), ролевая модель доступа (RBAC), REST API и документация Swagger.

Контрольная работа №2 по дисциплине «Фронтенд и бэкенд разработка» (практические занятия 7–11).

## Возможности

- Регистрация и вход пользователей (email + хеширование пароля через bcrypt)
- JWT access-токен и refresh-токен с автоматическим обновлением на клиенте (axios interceptors)
- Каталог ароматов: просмотр, создание, редактирование и удаление (по ролям)
- Управление пользователями для администратора (список, смена роли, блокировка)
- REST API на Node.js и Express
- Клиент на React с маршрутизацией (react-router-dom)
- Интерактивная документация API (Swagger UI)

## Стек

| Часть | Технологии |
|-------|------------|
| Backend | Node.js, Express, bcrypt, jsonwebtoken, nanoid, cors, swagger-jsdoc, swagger-ui-express |
| Frontend | React 18, Vite, axios, react-router-dom |

## Структура репозитория

```
KR2/
├── server/              # Сервер и API
│   ├── index.js         # Маршруты, auth, RBAC, Swagger
│   └── package.json
├── client/              # React-приложение
│   ├── src/
│   │   ├── api/         # axios и interceptors
│   │   ├── pages/       # Login, Register, Products, Users…
│   │   └── roles.js     # Подписи ролей на русском
│   └── public/images/   # Изображения товаров
├── screenshots/         # Скриншоты тестирования (Postman, UI)
└── README.md
```

## Модель пользователя

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | Уникальный идентификатор (nanoid) |
| `email` | string | Email (логин) |
| `first_name` | string | Имя |
| `last_name` | string | Фамилия |
| `hashedPassword` | string | Хеш пароля (bcrypt, только на сервере) |
| `role` | string | `user`, `seller` или `admin` |
| `blocked` | boolean | Заблокирован ли пользователь |

## Модель товара

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | Уникальный идентификатор (nanoid) |
| `title` | string | Название аромата |
| `category` | string | Категория (женские / мужские / унисекс) |
| `description` | string | Описание |
| `volume` | string | Объём (например, 50 мл) |
| `price` | number | Цена, ₽ |
| `image` | string | Путь к изображению (необязательно) |

## Роли (RBAC)

| Роль в API | В интерфейсе | Права |
|------------|--------------|-------|
| `user` | покупатель | Просмотр каталога |
| `seller` | продавец | Просмотр + создание и редактирование товаров |
| `admin` | админ | Всё выше + удаление товаров + управление пользователями |

> При регистрации можно выбрать только `user` или `seller`. Роль `admin` назначается демо-аккаунтом или существующим администратором.

## Требования

- [Node.js](https://nodejs.org/)
- npm

## Установка и запуск

### Backend (порт 3004)

```bash
cd server
npm install
npm start
```

- API: [http://localhost:3004/api/products](http://localhost:3004/api/products) (требуется авторизация)
- Swagger: [http://localhost:3004/api-docs](http://localhost:3004/api-docs)

### Frontend (порт 5173)

```bash
cd client
npm install
npm run dev
```

Приложение: [http://localhost:5173](http://localhost:5173)

Сборка production-версии:

```bash
npm run build
npm run preview
```

> Backend и frontend должны работать одновременно. Запросы с клиента проксируются на `localhost:3004` через Vite.

## Пробные аккаунты

| Email | Пароль | Роль | Имя |
|-------|--------|------|-----|
| admin@perfume.shop | admin123 | admin | Василий Иванович |
| ivan@perfume.shop | buyer123 | user | Иван Иванов |

## Аутентификация

### Хеширование пароля

Функции `hashPassword` и `verifyPassword` в `server/index.js` используют **bcrypt** (cost = 10). Соль генерируется библиотекой автоматически и хранится внутри строки хеша.

### JWT и refresh

- При входе: `POST /api/auth/login` → `{ accessToken, refreshToken }`
- Access-токен передаётся в заголовке: `Authorization: Bearer <accessToken>`
- Обновление пары: `POST /api/auth/refresh` с refresh-токеном в том же заголовке
- На клиенте токены хранятся в **localStorage**; при ответе 401 axios interceptor обновляет токены и повторяет запрос

### Swagger Authorize

1. Выполните `POST /api/auth/login` и скопируйте `accessToken`
2. Нажмите **Authorize** → вставьте токен (или `Bearer <токен>`)
3. Для `POST /api/auth/refresh` в Authorize подставьте **refreshToken**

## API

### Auth

| Метод | Endpoint | Доступ | Описание |
|-------|----------|--------|----------|
| `POST` | `/api/auth/register` | гость | Регистрация |
| `POST` | `/api/auth/login` | гость | Вход, выдача токенов |
| `POST` | `/api/auth/refresh` | гость | Обновление пары токенов |
| `GET` | `/api/auth/me` | авторизованный | Текущий пользователь |

### Users (только admin)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/users` | Список пользователей |
| `GET` | `/api/users/:id` | Пользователь по ID |
| `PUT` | `/api/users/:id` | Обновление (имя, роль, blocked) |
| `DELETE` | `/api/users/:id` | Блокировка пользователя |

### Products

| Метод | Endpoint | Доступ | Описание |
|-------|----------|--------|----------|
| `GET` | `/api/products` | user, seller, admin | Список товаров |
| `GET` | `/api/products/:id` | user, seller, admin | Товар по ID |
| `POST` | `/api/products` | seller, admin | Создание товара |
| `PUT` | `/api/products/:id` | seller, admin | Обновление товара |
| `DELETE` | `/api/products/:id` | admin | Удаление товара |

Пример тела для `POST /api/auth/register`:

```json
{
  "email": "seller@perfume.shop",
  "first_name": "Анна",
  "last_name": "Продавцова",
  "password": "qwerty123",
  "role": "seller"
}
```

Пример тела для `POST /api/products`:

```json
{
  "title": "Chanel No. 5",
  "category": "женские",
  "description": "Классический цветочный аромат",
  "volume": "50 мл",
  "price": 8900,
  "image": "/images/chanel-no5.jpg"
}
```

## Изображения

Файлы фотографий размещаются в `client/public/images/` (имена соответствуют полю `image` в данных товаров, например `chanel-no5.jpg`).

## Практики 7–12

Краткая сводка по таблице, что сделано из каждой практики.

| № | Ключевые требования задания | Где и как реализовано |
|---|-----------------------------|------------------------|
| 7 | Node.js API, bcrypt, пользователь, CRUD товаров, Swagger | `server/index.js` |
| 8 | JWT при входе, `GET /auth/me`, защита операций по id товара | `authMiddleware`, `jsonwebtoken` |
| 9 | Refresh-токен, `POST /auth/refresh`, ответ пара токенов | `generateRefreshToken`, `refreshTokens`, заголовок `Authorization` |
| 10 | React/Vue, все маршруты API, управление товарами, вход/регистрация, логика 401→refresh | `client/`, `api/client.js` |
| 11 | Роли гость / пользователь / продавец / админ, маршруты users, ограничения по products | `ROLES`, `roleMiddleware`, `Users.jsx` |

---
