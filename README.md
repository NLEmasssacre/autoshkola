# 🚗 Автошкола — Веб-приложение

Полноценная система управления автошколой: ученики, инструкторы, занятия, экзамены.

---

## ⚡ Быстрый запуск

### 1. Требования
- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) v14+

---

### 2. База данных

```bash
# Откройте psql или pgAdmin и выполните:
createdb driving_school

# Запустите SQL-скрипт:
psql -U postgres -d driving_school -f database/schema.sql
```

Или через pgAdmin: создайте БД `driving_school` → откройте Query Tool → выполните содержимое `database/schema.sql`.

---

### 3. Backend

```bash
cd backend

# Установка зависимостей
npm install

# Настройка переменных окружения
# Откройте .env и укажите правильные данные PostgreSQL:
#   DB_USER=postgres
#   DB_PASSWORD=ваш_пароль

# Запуск (production)
npm start

# Запуск (development с hot-reload)
npm run dev
```

Сервер запустится на **http://localhost:5000**

---

### 4. Frontend

Frontend автоматически раздаётся через Express (`/frontend`).  
Откройте браузер: **http://localhost:5000/login.html**

---

## 🔐 Тестовые данные

| Роль | Email | Пароль |
|------|-------|--------|
| Admin | admin@autoshkola.ru | Admin1234! |

Дополнительных пользователей создавайте через **Регистрацию** или через API.

---

## 📁 Структура проекта

```
ранэль/
├── backend/
│   ├── server.js          # Точка входа Express
│   ├── package.json
│   ├── .env               # Переменные окружения
│   ├── config/
│   │   └── db.js          # Пул соединений PostgreSQL
│   ├── middleware/
│   │   └── auth.js        # JWT авторизация + RBAC
│   └── routes/
│       ├── auth.js        # POST /register, POST /login, GET /me
│       ├── students.js    # CRUD учеников
│       ├── instructors.js # CRUD инструкторов
│       ├── lessons.js     # CRUD занятий + запись студентов
│       └── exams.js       # CRUD экзаменов
├── frontend/
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html     # SPA-дашборд
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── utils.js       # API helper, форматтеры, утилиты
│       └── dashboard.js   # Логика всех страниц
└── database/
    └── schema.sql         # DDL + индексы + seed-данные
```

---

## 🛠 API Endpoints

### Auth
| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/register | Регистрация |
| POST | /api/login | Вход |
| GET  | /api/me | Текущий пользователь |

### Students
| Метод | URL | Доступ |
|-------|-----|--------|
| GET | /api/students | admin, instructor |
| GET | /api/students/:id | admin, instructor, student (свой) |
| POST | /api/students | admin |
| PUT | /api/students/:id | admin |
| DELETE | /api/students/:id | admin |

### Instructors
| Метод | URL | Доступ |
|-------|-----|--------|
| GET | /api/instructors | все |
| POST | /api/instructors | admin |
| PUT | /api/instructors/:id | admin |
| DELETE | /api/instructors/:id | admin |

### Lessons
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/lessons | Список занятий |
| POST | /api/lessons | Создать занятие (admin) |
| DELETE | /api/lessons/:id | Удалить (admin) |
| POST | /api/lessons/:id/register | Записаться (student) |
| GET | /api/lessons/:id/students | Список записанных |

### Exams
| Метод | URL | Доступ |
|-------|-----|--------|
| GET | /api/exams | admin |
| GET | /api/exams/my | student |
| POST | /api/exams | admin |
| PUT | /api/exams/:id | admin |
| DELETE | /api/exams/:id | admin |

---

## 🎨 Роли и доступ

| Функция | Admin | Instructor | Student |
|---------|:-----:|:----------:|:-------:|
| Добавление учеников | ✅ | — | — |
| Просмотр учеников | ✅ | ✅ | — |
| Добавление инструкторов | ✅ | — | — |
| Создание занятий | ✅ | — | — |
| Просмотр занятий | ✅ | ✅ (свои) | ✅ |
| Запись на занятие | — | — | ✅ |
| Управление экзаменами | ✅ | — | — |
| Просмотр своих экзаменов | — | — | ✅ |
| Статистика | ✅ | — | — |
