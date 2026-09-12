require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Song = require('../models/Song');
const User = require('../models/User');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const songs = await Song.find().lean();
  const artists = await User.find({ role: { $in: ['artist', 'admin'] } })
    .select('username email role')
    .lean();

  console.log('songs', songs.length);
  console.log('artists', JSON.stringify(artists, null, 2));
  for (const s of songs) {
    console.log('-', s.title, '|', s.audioPath, '|', s.coverPath || '(no cover)');
  }

  const outDir = path.join(__dirname, '..', '..', 'seed-data');
  fs.mkdirSync(outDir, { recursive: true });

  const songExport = songs.map((s) => ({
    title: s.title,
    artistName: s.artistName,
    genre: s.genre,
    duration: s.duration,
    audioPath: s.audioPath.replace(/\\/g, '/'),
    coverPath: (s.coverPath || '').replace(/\\/g, '/'),
    playCount: s.playCount || 0,
    isHidden: !!s.isHidden,
  }));

  fs.writeFileSync(
    path.join(outDir, 'songs.json'),
    JSON.stringify(songExport, null, 2),
    'utf8'
  );
  console.log('wrote seed-data/songs.json');
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
