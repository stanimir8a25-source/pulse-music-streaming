const express = require('express');
const fs = require('fs');
const path = require('path');
const { parseFile } = require('music-metadata');
const Song = require('../models/Song');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');
const { uploadSongFiles } = require('../middleware/upload');

const router = express.Router();

function resolveSongFile(audioPath) {
  // Нормализираме Windows \ към /
  return path.resolve(__dirname, '..', audioPath.replace(/\\/g, '/'));
}

// GET /api/songs — списък с песни (скритите не се показват на нормални потребители)
router.get('/', async (req, res) => {
  try {
    const songs = await Song.find({ isHidden: false })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username role');

    res.json({ songs });
  } catch (error) {
    console.error('List songs error:', error.message);
    res.status(500).json({ message: 'Грешка при зареждане на песните.' });
  }
});

// GET /api/songs/my — песните на текущия артист
router.get('/my', protect, requireRole('artist', 'admin'), async (req, res) => {
  try {
    const songs = await Song.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ songs });
  } catch (error) {
    console.error('My songs error:', error.message);
    res.status(500).json({ message: 'Грешка при зареждане на твоите песни.' });
  }
});

// GET /api/songs/search?q=&genre=&artist= — търсене
router.get('/search', async (req, res) => {
  try {
    const { q, genre, artist } = req.query;
    const filter = { isHidden: false };

    if (genre && genre.trim()) {
      filter.genre = new RegExp(genre.trim(), 'i');
    }

    if (artist && artist.trim()) {
      filter.artistName = new RegExp(artist.trim(), 'i');
    }

    // q търси в заглавие, жанр или изпълнител
    if (q && q.trim()) {
      const text = new RegExp(q.trim(), 'i');
      filter.$or = [
        { title: text },
        { genre: text },
        { artistName: text },
      ];
    }

    const songs = await Song.find(filter)
      .sort({ playCount: -1, createdAt: -1 })
      .populate('uploadedBy', 'username role');

    res.json({ songs });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ message: 'Грешка при търсене.' });
  }
});

// GET /api/songs/recommendations — опростени препоръки по история
router.get('/recommendations', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('listeningHistory');
    const history = (user.listeningHistory || []).filter(Boolean);

    if (history.length === 0) {
      // Ако няма история — показваме най-слушаните
      const popular = await Song.find({ isHidden: false })
        .sort({ playCount: -1 })
        .limit(10);
      return res.json({
        songs: popular,
        reason: 'Популярни песни (все още нямаш история на слушане)',
      });
    }

    // Взимаме жанрове и изпълнители от последните слушания
    const genres = [...new Set(history.map((s) => s.genre).filter(Boolean))];
    const artists = [...new Set(history.map((s) => s.artistName).filter(Boolean))];
    const heardIds = history.map((s) => s._id);

    const recommended = await Song.find({
      isHidden: false,
      _id: { $nin: heardIds },
      $or: [
        { genre: { $in: genres } },
        { artistName: { $in: artists } },
      ],
    })
      .sort({ playCount: -1 })
      .limit(12);

    // Ако няма достатъчно съвпадения — допълваме с популярни
    let songs = recommended;
    if (songs.length < 6) {
      const extra = await Song.find({
        isHidden: false,
        _id: { $nin: [...heardIds, ...songs.map((s) => s._id)] },
      })
        .sort({ playCount: -1 })
        .limit(6 - songs.length);
      songs = [...songs, ...extra];
    }

    res.json({
      songs,
      reason: `Според слушаната ти музика (${genres.slice(0, 3).join(', ') || 'жанрове'})`,
    });
  } catch (error) {
    console.error('Recommendations error:', error.message);
    res.status(500).json({ message: 'Грешка при препоръки.' });
  }
});

// GET /api/songs/:id/stream — стрийминг на части с HTTP Range
router.get('/:id/stream', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song || song.isHidden) {
      return res.status(404).json({ message: 'Песента не е намерена.' });
    }

    const filePath = resolveSongFile(song.audioPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Аудио файлът липсва на сървъра.' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Браузърът иска само част от файла (за seek и стабилен стрийминг)
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (Number.isNaN(start) || start >= fileSize || end >= fileSize) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });

      // Използваме res.status/set (не writeHead), за да запазим CORS хедърите
      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg',
      });

      stream.pipe(res);
      return;
    }

    // Ако няма Range — изпращаме целия файл
    res.status(200);
    res.set({
      'Content-Length': fileSize,
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Stream error:', error.message);
    res.status(500).json({ message: 'Грешка при стрийминг.' });
  }
});

// POST /api/songs/:id/play — +1 слушане + история (за препоръки)
router.post('/:id/play', protect, async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { $inc: { playCount: 1 } },
      { new: true }
    );

    if (!song || song.isHidden) {
      return res.status(404).json({ message: 'Песента не е намерена.' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        listeningHistory: {
          $each: [song._id],
          $position: 0,
          $slice: 50,
        },
      },
    });

    res.json({ playCount: song.playCount });
  } catch (error) {
    console.error('Play count error:', error.message);
    res.status(500).json({ message: 'Грешка при запис на слушане.' });
  }
});

// POST /api/songs — качване на песен (само artist или admin)
router.post(
  '/',
  protect,
  requireRole('artist', 'admin'),
  (req, res, next) => {
    uploadSongFiles(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { title, genre, featuredArtists } = req.body;

      if (!title || !genre) {
        return res.status(400).json({
          message: 'Попълни title и genre.',
        });
      }

      if (!req.files || !req.files.audio || !req.files.audio[0]) {
        return res.status(400).json({ message: 'Качи MP3 файл.' });
      }

      const audioFile = req.files.audio[0];
      const coverFile = req.files.cover ? req.files.cover[0] : null;
      const audioFullPath = path.join(
        __dirname,
        '..',
        'uploads',
        'audio',
        audioFile.filename
      );

      // Продължителността се взима от самия MP3 файл
      let durationSec = 0;
      try {
        const meta = await parseFile(audioFullPath);
        durationSec = Math.max(1, Math.round(meta.format.duration || 0));
      } catch (metaErr) {
        console.error('Metadata error:', metaErr.message);
        return res.status(400).json({
          message: 'Не можах да прочета продължителността от MP3 файла.',
        });
      }

      if (!durationSec) {
        return res.status(400).json({
          message: 'Невалиден MP3 файл (липсва продължителност).',
        });
      }

      // Изпълнител = профилът на артиста + опционално ft.
      const baseName = req.user.username;
      const feat = String(featuredArtists || '').trim();
      const artistName = feat ? `${baseName} ft. ${feat}` : baseName;

      const song = await Song.create({
        title,
        artistName,
        genre,
        duration: durationSec,
        audioPath: path.join('uploads', 'audio', audioFile.filename),
        coverPath: coverFile
          ? path.join('uploads', 'covers', coverFile.filename)
          : '',
        uploadedBy: req.user._id,
      });

      res.status(201).json({
        message: 'Песента е качена успешно.',
        song,
      });
    } catch (error) {
      console.error('Upload song error:', error.message);
      res.status(500).json({ message: 'Грешка при качване на песента.' });
    }
  }
);

module.exports = router;
