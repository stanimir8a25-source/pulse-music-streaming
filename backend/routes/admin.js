const fs = require('fs');
const path = require('path');
const express = require('express');
const Song = require('../models/Song');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// Само админ
router.use(protect, requireRole('admin'));

function removeFileIfExists(relativePath) {
  if (!relativePath) return;
  const full = path.resolve(__dirname, '..', relativePath.replace(/\\/g, '/'));
  if (fs.existsSync(full)) {
    fs.unlinkSync(full);
  }
}

// GET /api/admin/stats — глобална статистика
router.get('/stats', async (req, res) => {
  try {
    const [usersCount, songsCount, playlistsCount, hiddenCount, topSongs, usersByRole] =
      await Promise.all([
        User.countDocuments(),
        Song.countDocuments(),
        Playlist.countDocuments(),
        Song.countDocuments({ isHidden: true }),
        Song.find().sort({ playCount: -1 }).limit(10).select('title artistName genre playCount isHidden'),
        User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      ]);

    const roles = { listener: 0, artist: 0, admin: 0 };
    usersByRole.forEach((row) => {
      roles[row._id] = row.count;
    });

    res.json({
      stats: {
        usersCount,
        songsCount,
        playlistsCount,
        hiddenCount,
        roles,
        topSongs,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error.message);
    res.status(500).json({ message: 'Грешка при статистика.' });
  }
});

// GET /api/admin/songs — всички песни (включително скрити)
router.get('/songs', async (req, res) => {
  try {
    const songs = await Song.find()
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username email role');

    res.json({ songs });
  } catch (error) {
    console.error('Admin songs error:', error.message);
    res.status(500).json({ message: 'Грешка при зареждане на песните.' });
  }
});

// PATCH /api/admin/songs/:id/visibility — скриване / показване
router.patch('/songs/:id/visibility', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Песента не е намерена.' });
    }

    // Ако пратят isHidden изрично — ползваме го, иначе обръщаме
    if (typeof req.body.isHidden === 'boolean') {
      song.isHidden = req.body.isHidden;
    } else {
      song.isHidden = !song.isHidden;
    }

    await song.save();

    res.json({
      message: song.isHidden ? 'Песента е скрита.' : 'Песента е видима отново.',
      song,
    });
  } catch (error) {
    console.error('Admin hide song error:', error.message);
    res.status(500).json({ message: 'Грешка при модерация на песен.' });
  }
});

// DELETE /api/admin/songs/:id — изтриване на песен + файлове
router.delete('/songs/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Песента не е намерена.' });
    }

    removeFileIfExists(song.audioPath);
    removeFileIfExists(song.coverPath);

    // Махаме песента и от плейлистите
    await Playlist.updateMany({}, { $pull: { songs: song._id } });
    await User.updateMany({}, { $pull: { listeningHistory: song._id } });
    await song.deleteOne();

    res.json({ message: 'Песента е изтрита.' });
  } catch (error) {
    console.error('Admin delete song error:', error.message);
    res.status(500).json({ message: 'Грешка при изтриване на песен.' });
  }
});

// GET /api/admin/users — управление на потребители
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    console.error('Admin users error:', error.message);
    res.status(500).json({ message: 'Грешка при зареждане на потребители.' });
  }
});

// PATCH /api/admin/users/:id/role — смяна на роля
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['listener', 'artist', 'admin'];

    if (!allowed.includes(role)) {
      return res.status(400).json({ message: 'Невалидна роля.' });
    }

    if (String(req.user._id) === String(req.params.id) && role !== 'admin') {
      return res.status(400).json({
        message: 'Не можеш да махнеш собствената си admin роля.',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Потребителят не е намерен.' });
    }

    res.json({ message: 'Ролята е обновена.', user });
  } catch (error) {
    console.error('Admin role error:', error.message);
    res.status(500).json({ message: 'Грешка при смяна на роля.' });
  }
});

// DELETE /api/admin/users/:id — изтриване на потребител
router.delete('/users/:id', async (req, res) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ message: 'Не можеш да изтриеш себе си.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Потребителят не е намерен.' });
    }

    await Playlist.deleteMany({ owner: user._id });
    await user.deleteOne();

    res.json({ message: 'Потребителят е изтрит.' });
  } catch (error) {
    console.error('Admin delete user error:', error.message);
    res.status(500).json({ message: 'Грешка при изтриване на потребител.' });
  }
});

module.exports = router;
