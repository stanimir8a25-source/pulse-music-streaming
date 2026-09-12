require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');
const playlistRoutes = require('./routes/playlists');
const adminRoutes = require('./routes/admin');

// Зареждаме моделите, за да са регистрирани в Mongoose
require('./models/User');
require('./models/Song');
require('./models/Playlist');

const app = express();
const PORT = process.env.PORT || 5000;

// cors = позволява фронтендът (localhost:5173) да говори с бекенда
app.use(cors());
// express.json = чете JSON данни от заявките
app.use(express.json());

// Прави качените файлове достъпни: http://localhost:5000/uploads/...
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Проста тестова страница: отвори http://localhost:5000 в браузъра
app.get('/', (req, res) => {
  res.json({
    message: 'Бекендът работи!',
    project: 'Музикална стрийминг платформа',
  });
});

// Проверка дали моделите са заредени
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'connected',
  });
});

// Автентикация: регистрация, логин, "кой съм аз"
app.use('/api/auth', authRoutes);

// Песни: списък, търсене, препоръки, качване, стрийминг
app.use('/api/songs', songRoutes);

// Плейлисти
app.use('/api/playlists', playlistRoutes);

// Админ панел
app.use('/api/admin', adminRoutes);

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Сървърът слуша на http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Грешка при стартиране:', error.message);
    process.exit(1);
  }
}

startServer();
