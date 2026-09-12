/**
 * Renames non-ASCII upload files to safe ASCII names and updates seed-data/songs.json
 * + MongoDB Song paths if connected.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Song = require('../models/Song');

function safeName(original, prefix) {
  const ext = path.extname(original) || '.mp3';
  const base = path
    .basename(original, ext)
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const cleaned = base || 'track';
  return `${prefix}-${cleaned}${ext}`.slice(0, 120);
}

async function main() {
  const root = path.join(__dirname, '..');
  const songsPath = path.join(root, '..', 'seed-data', 'songs.json');
  const songs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));

  const mapping = new Map(); // oldRel -> newRel

  for (const song of songs) {
    for (const key of ['audioPath', 'coverPath']) {
      const rel = (song[key] || '').replace(/\\/g, '/');
      if (!rel) continue;
      if (mapping.has(rel)) {
        song[key] = mapping.get(rel);
        continue;
      }
      const abs = path.join(root, rel);
      if (!fs.existsSync(abs)) {
        console.warn('missing', rel);
        continue;
      }
      const dir = path.dirname(rel);
      const file = path.basename(rel);
      const needsRename = /[^\x00-\x7F]/.test(file);
      if (!needsRename) {
        mapping.set(rel, rel);
        continue;
      }
      const prefix = path.basename(file).split('-')[0] || Date.now();
      let next = `${dir}/${safeName(file, prefix)}`;
      let absNext = path.join(root, next);
      let n = 1;
      while (fs.existsSync(absNext) && absNext !== abs) {
        next = `${dir}/${safeName(file, `${prefix}_${n}`)}`;
        absNext = path.join(root, next);
        n += 1;
      }
      if (abs !== absNext) {
        fs.renameSync(abs, absNext);
        console.log('renamed', file, '->', path.basename(next));
      }
      mapping.set(rel, next);
      song[key] = next;
    }
  }

  fs.writeFileSync(songsPath, JSON.stringify(songs, null, 2), 'utf8');
  console.log('updated seed-data/songs.json');

  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    for (const [oldRel, newRel] of mapping.entries()) {
      if (oldRel === newRel) continue;
      const r1 = await Song.updateMany(
        { audioPath: oldRel },
        { $set: { audioPath: newRel } }
      );
      const r2 = await Song.updateMany(
        { audioPath: oldRel.replace(/\//g, '\\') },
        { $set: { audioPath: newRel } }
      );
      const r3 = await Song.updateMany(
        { coverPath: oldRel },
        { $set: { coverPath: newRel } }
      );
      const r4 = await Song.updateMany(
        { coverPath: oldRel.replace(/\//g, '\\') },
        { $set: { coverPath: newRel } }
      );
      console.log('db map', oldRel, '->', newRel, {
        a: r1.modifiedCount + r2.modifiedCount,
        c: r3.modifiedCount + r4.modifiedCount,
      });
    }
    // Also fix any remaining songs by matching basename timestamps
    const all = await Song.find();
    for (const s of all) {
      const audio = (s.audioPath || '').replace(/\\/g, '/');
      if (audio && !fs.existsSync(path.join(root, audio))) {
        console.warn('still missing audio for', s.title, audio);
      }
    }
    await mongoose.disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
