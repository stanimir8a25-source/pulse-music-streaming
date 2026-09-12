const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const { ensureLikedSongs } = require('../utils/likedSongs');
const { assertRealEmail } = require('../utils/emailValidation');

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatarPath: user.avatarPath || '',
  };
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'Попълни username, email и password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Паролата трябва да е поне 6 символа.',
      });
    }

    // Проверка дали имейлът е реален (формат + MX + disposable + SMTP)
    const validEmail = await assertRealEmail(email);

    const allowedRoles = ['listener', 'artist'];
    const selectedRole = role && allowedRoles.includes(role) ? role : 'listener';

    if (role === 'admin') {
      return res.status(403).json({
        message: 'Админ акаунт не може да се създава чрез регистрация.',
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: validEmail }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Този email или username вече е зает.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email: validEmail,
      password: hashedPassword,
      role: selectedRole,
      isEmailVerified: true,
    });

    await ensureLikedSongs(user._id);

    const token = createToken(user);

    res.status(201).json({
      message: 'Регистрацията е успешна.',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Register error:', error.message);
    const status = error.status || 500;
    res.status(status).json({
      message: status === 400 ? error.message : 'Грешка при регистрация.',
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Попълни email и password.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Грешен email или парола.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Грешен email или парола.' });
    }

    await ensureLikedSongs(user._id);

    const token = createToken(user);

    res.json({
      message: 'Успешен вход.',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Грешка при вход.' });
  }
});

router.get('/me', protect, async (req, res) => {
  await ensureLikedSongs(req.user._id);
  res.json({ user: publicUser(req.user) });
});

// POST /api/auth/avatar — профилна снимка
router.post('/avatar', protect, (req, res) => {
  uploadAvatar(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Качи изображение.' });
      }

      const avatarPath = path.join('uploads', 'avatars', req.file.filename);
      req.user.avatarPath = avatarPath;
      await req.user.save();

      res.json({
        message: 'Профилната снимка е обновена.',
        user: publicUser(req.user),
      });
    } catch (error) {
      console.error('Avatar error:', error.message);
      res.status(500).json({ message: 'Грешка при качване на снимка.' });
    }
  });
});

module.exports = router;
