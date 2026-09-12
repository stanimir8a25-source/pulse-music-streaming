/**
 * Зарежда демо потребители + песните от seed-data/songs.json
 * (аудио/обложки трябва да са в backend/uploads/).
 *
 * Употреба (от папка backend):
 *   node scripts/importDemoSeed.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Song = require('../models/Song');
const Playlist = require('../models/Playlist');
const { ensureLikedSongs } = require('../utils/likedSongs');

const DEMO_USERS = [
  {
    username: 'listener1',
    email: 'listener@test.com',
    password: '123456',
    role: 'listener',
  },
  {
    username: 'artist1',
    email: 'artist@test.com',
    password: '123456',
    role: 'artist',
  },
  {
    username: 'admin1',
    email: 'admin@test.com',
    password: '123456',
    role: 'admin',
  },
];

async function upsertUser(spec) {
  let user = await User.findOne({ email: spec.email });
  const hash = await bcrypt.hash(spec.password, 10);
  if (!user) {
    user = await User.create({
      username: spec.username,
      email: spec.email,
      password: hash,
      role: spec.role,
      isEmailVerified: true,
    });
    console.log('created user', spec.email);
  } else {
    user.username = spec.username;
    user.password = hash;
    user.role = spec.role;
    user.isEmailVerified = true;
    await user.save();
    console.log('updated user', spec.email);
  }
  await ensureLikedSongs(user._id);
  return user;
}

async function main() {
  const songsPath = path.join(__dirname, '..', '..', 'seed-data', 'songs.json');
  if (!fs.existsSync(songsPath)) {
    throw new Error('Липсва seed-data/songs.json');
  }
  const songs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));

  await mongoose.connect(process.env.MONGODB_URI);

  const users = {};
  for (const spec of DEMO_USERS) {
    users[spec.role] = await upsertUser(spec);
  }
  const artist = users.artist;

  let imported = 0;
  for (const item of songs) {
    const audioAbs = path.resolve(__dirname, '..', item.audioPath);
    if (!fs.existsSync(audioAbs)) {
      console.warn('skip missing audio:', item.audioPath);
      continue;
    }

    const existing = await Song.findOne({
      title: item.title,
      artistName: item.artistName,
      audioPath: item.audioPath,
    });
    if (existing) {
      console.log('exists:', item.title);
      continue;
    }

    await Song.create({
      title: item.title,
      artistName: item.artistName,
      genre: item.genre,
      duration: item.duration,
      audioPath: item.audioPath,
      coverPath: item.coverPath || '',
      uploadedBy: artist._id,
      playCount: item.playCount || 0,
      isHidden: !!item.isHidden,
    });
    imported += 1;
    console.log('imported:', item.title);
  }

  console.log('Done. Imported', imported, 'songs.');
  console.log('Demo accounts (password 123456):');
  for (const u of DEMO_USERS) {
    console.log(`  ${u.role}: ${u.email}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
