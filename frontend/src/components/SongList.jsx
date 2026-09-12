import { fileUrl } from '../api';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylistPicker } from '../context/PlaylistPickerContext';

export default function SongList({
  songs,
  emptyText = 'Няма песни.',
  onRemove,
  onOpenNowPlaying,
  variant = 'rows',
  showAdd = true,
}) {
  const { playSong, togglePlay, currentSong, isPlaying } = usePlayer();
  const { openPicker } = usePlaylistPicker();

  // Клик върху песента → Now Playing без да спира текущата
  function openSong(song) {
    const active = currentSong && currentSong._id === song._id;
    if (!active) {
      playSong(song, songs);
    } else if (!isPlaying) {
      togglePlay();
    }
    if (onOpenNowPlaying) onOpenNowPlaying();
  }

  // Бутон ▶/❚❚ → play/pause; нова песен се пуска и отваря Now Playing
  function toggleSong(song) {
    const active = currentSong && currentSong._id === song._id;
    if (active) {
      togglePlay();
      return;
    }
    playSong(song, songs);
    if (onOpenNowPlaying) onOpenNowPlaying();
  }

  if (!songs || songs.length === 0) {
    return <p className="hint">{emptyText}</p>;
  }

  if (variant === 'cards') {
    return (
      <div className="card-grid">
        {songs.map((song) => {
          const active = currentSong && currentSong._id === song._id;
          return (
            <article key={song._id} className={`track-card ${active ? 'active' : ''}`}>
              <div className="track-card-art">
                {song.coverPath ? (
                  <img src={fileUrl(song.coverPath)} alt="" />
                ) : (
                  <div className="cover-placeholder" />
                )}
                <button
                  type="button"
                  className="card-play"
                  onClick={() => toggleSong(song)}
                >
                  {active && isPlaying ? '❚❚' : '▶'}
                </button>
              </div>
              <button type="button" className="track-card-meta" onClick={() => openSong(song)}>
                <h3>{song.title}</h3>
                <p>
                  {song.artistName} · {song.genre}
                </p>
              </button>
              {showAdd && (
                <button
                  type="button"
                  className="tiny-btn"
                  onClick={() => openPicker(song)}
                >
                  + Плейлист
                </button>
              )}
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="track-table">
      <ul className="catalog">
        {songs.map((song, index) => {
          const active = currentSong && currentSong._id === song._id;
          return (
            <li key={song._id} className={`song-item ${active ? 'active' : ''}`}>
              <button
                type="button"
                className="track-index"
                onClick={() => openSong(song)}
              >
                {active && isPlaying ? '❚❚' : index + 1}
              </button>

              <button
                type="button"
                className="cover-btn"
                onClick={() => openSong(song)}
              >
                {song.coverPath ? (
                  <img src={fileUrl(song.coverPath)} alt="" />
                ) : (
                  <div className="cover-placeholder" />
                )}
              </button>

              <button
                type="button"
                className="track-text-btn"
                onClick={() => openSong(song)}
              >
                <strong className={active ? 'playing-title' : ''}>{song.title}</strong>
                <span>{song.artistName}</span>
              </button>

              <span className="track-genre hide-sm">{song.genre}</span>

              <div className="song-actions">
                {showAdd && (
                  <button
                    type="button"
                    className="tiny-btn"
                    onClick={() => openPicker(song)}
                    title="Добави в плейлист"
                  >
                    +
                  </button>
                )}
                {onRemove && (
                  <button
                    type="button"
                    className="tiny-btn"
                    onClick={() => onRemove(song)}
                    title="Премахни"
                  >
                    ×
                  </button>
                )}
                <button
                  type="button"
                  className="song-play"
                  onClick={() => toggleSong(song)}
                >
                  {active && isPlaying ? '❚❚' : '▶'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
