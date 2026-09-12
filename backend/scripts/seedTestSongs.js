/**
 * Добавя / маха 100 тестови песни за UI тестове.
 *
 * Добавяне:  node scripts/seedTestSongs.js
 * Махане:   node scripts/seedTestSongs.js --remove
 *
 * Песните се разпознават по artistName === TEST_ARTIST_MARKER
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Song = require('../models/Song');
const User = require('../models/User');

const TEST_ARTIST_MARKER = 'Pulse Seed Catalog';

const TITLES = [
  'Midnight Drive',
  'Neon Skies',
  'Quiet Storm',
  'Glass Heart',
  'Afterglow',
  'City Lights Fade',
  'Soft Rebellion',
  'Echoes of You',
  'Blue Hour',
  'Paper Planes',
  'Lost in Transit',
  'Velvet Rain',
  'Static Dreams',
  'Golden Hour Loop',
  'Empty Seats',
  'Firefly Lane',
  'Slow Burn',
  'Ocean Floor',
  'Candlelight',
  'Runaway Train',
  'Silver Tongue',
  'Dust & Diamonds',
  'Night Shift',
  'Hollow Crown',
  'Summer Ghost',
  'Broken Compass',
  'Lavender Smoke',
  'Last Call',
  'Magnetic North',
  'Faded Polaroids',
  'Thunder Without Rain',
  'Cherry Wine Dreams',
  'Interstate Melancholy',
  'Porcelain Sky',
  'Heartbeat Skip',
  'Cold Coffee',
  'Northern Lights',
  'Whisper Network',
  'Rust & Chrome',
  'Sunday Mourning',
  'Invisible Threads',
  'Moonlit Alley',
  'Sugar Rush',
  'Phantom Frequency',
  'Amber Eyes',
  'Driftwood',
  'Satellite Love',
  'Black Coffee Blues',
  'Wildfire Season',
  'Concrete Garden',
  'Soft Landing',
  'Ivory Tower',
  'Rain on the Roof',
  'Borrowed Time',
  'Electric Silence',
  'Hometown Hero',
  'Midnight Confession',
  'Glass Half Empty',
  'Starlight Motel',
  'Crimson Tide',
  'Halfway Home',
  'Shadow Boxing',
  'Perfume & Gasoline',
  'Low Battery',
  'Desert Bloom',
  'Telephone Wire',
  'Autumn Archive',
  'Bright Side Closed',
  'Ghost of a Chance',
  'Marble Floors',
  'Late Reply',
  'Sunset Boulevard',
  'Iron Lace',
  'Parallel Lines',
  'Coffee Shop Confession',
  'Winter Windows',
  'Burn Notice',
  'Silk Road',
  'Overexposed',
  'Harbor Lights',
  'Second Chance',
  'Violet Hour',
  'Paper Tiger',
  'Loud Silence',
  'Mirrorball',
  'Coastline',
  'False Alarm',
  'Honeyed Words',
  'Underwater',
  'Dead End Street',
  'Phoenix Rising',
  'Soft Focus',
  'Gravity Well',
  'Red Letter Day',
  'Cloud Nine',
  'Bittersweet Symphony',
  'Open Road',
  'Night Owl',
  'Fractured Light',
  'Forever Temporary',
];

const GENRES = [
  'Pop',
  'Rock',
  'Hip-Hop',
  'R&B',
  'Electronic',
  'Indie',
  'Jazz',
  'Alternative',
  'Soul',
  'Dance',
];

const FEATURE_NAMES = [
  '',
  ' ft. Nova Blue',
  ' ft. The Midnight Choir',
  ' ft. Luna Park',
  ' ft. Atlas Gray',
  ' ft. Soft Circuit',
];

async function removeSeeds() {
  const result = await Song.deleteMany({ artistName: { $regex: `^${TEST_ARTIST_MARKER}` } });
  console.log(`Премахнати ${result.deletedCount} тестови песни.`);
}

async function seed() {
  if (TITLES.length !== 100) {
    throw new Error(`Очаквани 100 заглавия, има ${TITLES.length}`);
  }

  const existing = await Song.countDocuments({
    artistName: { $regex: `^${TEST_ARTIST_MARKER}` },
  });
  if (existing > 0) {
    console.log(`Вече има ${existing} тестови песни. Първо ги махни с --remove.`);
    return;
  }

  const artist =
    (await User.findOne({ role: 'artist' })) ||
    (await User.findOne({}));

  if (!artist) {
    throw new Error('Няма потребител в базата — регистрирай артист първо.');
  }

  // Преизползваме реален файл ако има, иначе placeholder пътища
  const sample = await Song.findOne({
    artistName: { $not: { $regex: `^${TEST_ARTIST_MARKER}` } },
  });

  const audioPath =
    sample?.audioPath || 'uploads/audio/seed-placeholder.mp3';
  const coverPath = sample?.coverPath || '';

  const docs = TITLES.map((title, i) => ({
    title,
    artistName: `${TEST_ARTIST_MARKER}${FEATURE_NAMES[i % FEATURE_NAMES.length]}`,
    genre: GENRES[i % GENRES.length],
    duration: 150 + ((i * 17) % 180),
    audioPath,
    coverPath,
    uploadedBy: artist._id,
    playCount: Math.floor(Math.random() * 5000),
    isHidden: false,
  }));

  await Song.insertMany(docs);
  console.log(`Добавени ${docs.length} тестови песни (артист маркер: "${TEST_ARTIST_MARKER}").`);
  console.log('За махане после: node scripts/seedTestSongs.js --remove');
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    if (process.argv.includes('--remove')) {
      await removeSeeds();
    } else {
      await seed();
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
