const express = require('express');
const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const { protect } = require('../middleware/auth');
const { ensureLikedSongs } = require('../utils/likedSongs');

const router = express.Router();

router.use(protect);

// GET /api/playlists — моите плейлисти (Liked Songs винаги първи)
router.get('/', async (req, res) => {
  try {
    await ensureLikedSongs(req.user._id);

    const playlists = await Playlist.find({ owner: req.user._id })
      .populate('songs');

    playlists.sort((a, b) => {
      if (a.isLikedSongs && !b.isLikedSongs) return -1;
      if (!a.isLikedSongs && b.isLikedSongs) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.json({ playlists });
  } catch (error) {
    console.error('List playlists error:', error.message);
    res.status(500).json({ message: 'Грешка при зареждане на плейлистите.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Въведи име на плейлиста.' });
    }

    if (name.trim().toLowerCase() === 'liked songs') {
      return res.status(400).json({
        message: 'Името „Liked Songs“ е запазено.',
      });
    }

    const playlist = await Playlist.create({
      name: name.trim(),
      owner: req.user._id,
      songs: [],
    });

    res.status(201).json({
      message: 'Плейлистът е създаден.',
      playlist,
    });
  } catch (error) {
    console.error('Create playlist error:', error.message);
    res.status(500).json({ message: 'Грешка при създаване на плейлист.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate('songs');

    if (!playlist) {
      return res.status(404).json({ message: 'Плейлистът не е намерен.' });
    }

    res.json({ playlist });
  } catch (error) {
    console.error('Get playlist error:', error.message);
    res.status(500).json({ message: 'Грешка при зареждане на плейлиста.' });
  }
});

router.post('/:id/songs', async (req, res) => {
  try {
    const { songId } = req.body;

    if (!songId) {
      return res.status(400).json({ message: 'Липсва songId.' });
    }

    const song = await Song.findById(songId);
    if (!song || song.isHidden) {
      return res.status(404).json({ message: 'Песента не е намерена.' });
    }

    const playlist = await Playlist.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!playlist) {
      return res.status(404).json({ message: 'Плейлистът не е намерен.' });
    }

    const alreadyIn = playlist.songs.some((id) => String(id) === String(songId));
    if (!alreadyIn) {
      playlist.songs.push(songId);
      await playlist.save();
    }

    await playlist.populate('songs');

    res.json({
      message: alreadyIn ? 'Песента вече е в плейлиста.' : 'Песента е добавена.',
      playlist,
    });
  } catch (error) {
    console.error('Add song to playlist error:', error.message);
    res.status(500).json({ message: 'Грешка при добавяне на песен.' });
  }
});

router.delete('/:id/songs/:songId', async (req, res) => {
  try {
    const playlist = await Playlist.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!playlist) {
      return res.status(404).json({ message: 'Плейлистът не е намерен.' });
    }

    playlist.songs = playlist.songs.filter(
      (id) => String(id) !== String(req.params.songId)
    );
    await playlist.save();
    await playlist.populate('songs');

    res.json({ message: 'Песента е премахната.', playlist });
  } catch (error) {
    console.error('Remove song error:', error.message);
    res.status(500).json({ message: 'Грешка при премахване на песен.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!playlist) {
      return res.status(404).json({ message: 'Плейлистът не е намерен.' });
    }

    if (playlist.isLikedSongs) {
      return res.status(400).json({
        message: 'Liked Songs не може да се изтрие.',
      });
    }

    await playlist.deleteOne();

    res.json({ message: 'Плейлистът е изтрит.' });
  } catch (error) {
    console.error('Delete playlist error:', error.message);
    res.status(500).json({ message: 'Грешка при изтриване на плейлист.' });
  }
});

module.exports = router;
