# Pulse — музикална стрийминг платформа (lite)

React (Vite) + Node.js/Express + MongoDB.

## Изисквания

- Node.js 18+
- MongoDB локално (или Atlas URI)

## Стартиране

### 1. Backend

```bash
cd backend
copy .env.example .env
npm install
npm start
```

Сървър: http://localhost:5000

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Клиент: http://localhost:5173

### 3. Демо данни (песни + акаунти)

В хранилището са включени:

- `backend/uploads/` — качените MP3 и обложки
- `seed-data/songs.json` — метаданни за песните

След като MongoDB работи и `.env` е настроен:

```bash
cd backend
node scripts/importDemoSeed.js
```

Това създава/обновява демо акаунти и импортира песните.

| Роля | Email | Парола |
|------|-------|--------|
| Слушател | listener@test.com | 123456 |
| Артист | artist@test.com | 123456 |
| Админ | admin@test.com | 123456 |

## Функции

- Регистрация / вход (JWT), роли: listener, artist, admin
- Каталог, търсене, препоръки
- Studio за качване на песни (артист)
- Плеър + Now Playing, плейлисти, Liked Songs
- Админ панел (статистика, модерация)
