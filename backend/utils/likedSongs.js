const Playlist = require('../models/Playlist');

async function ensureLikedSongs(userId) {
  let liked = await Playlist.findOne({ owner: userId, isLikedSongs: true });
  if (!liked) {
    liked = await Playlist.create({
      name: 'Liked Songs',
      owner: userId,
      songs: [],
      isLikedSongs: true,
    });
  }
  return liked;
}

module.exports = { ensureLikedSongs };
