import { createContext, useContext, useState } from 'react';
import { apiRequest } from '../api';

const PlaylistPickerContext = createContext(null);

export function PlaylistPickerProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [song, setSong] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function openPicker(selectedSong) {
    setSong(selectedSong);
    setOpen(true);
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/api/playlists');
      setPlaylists(data.playlists || []);
    } catch (err) {
      setError(err.message);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }

  function closePicker() {
    setOpen(false);
    setSong(null);
    setMessage('');
    setError('');
  }

  async function addToPlaylist(playlistId) {
    if (!song) return;
    setError('');
    try {
      const data = await apiRequest(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        body: JSON.stringify({ songId: song._id }),
      });
      setMessage(data.message);
      setTimeout(() => closePicker(), 700);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <PlaylistPickerContext.Provider value={{ openPicker, closePicker }}>
      {children}

      {open && (
        <>
          <button
            type="button"
            className="drawer-backdrop"
            aria-label="Затвори"
            onClick={closePicker}
          />
          <aside className="playlist-drawer">
            <div className="drawer-head">
              <h3>Добави в плейлист</h3>
              <button type="button" className="tiny-btn" onClick={closePicker}>
                ×
              </button>
            </div>

            {song && (
              <p className="drawer-song">
                <strong>{song.title}</strong>
                <span>{song.artistName}</span>
              </p>
            )}

            {loading && <p className="hint">Зареждане...</p>}
            {error && <p className="error">{error}</p>}
            {message && <p className="success">{message}</p>}

            <ul className="drawer-list">
              {playlists.map((playlist) => (
                <li key={playlist._id}>
                  <button
                    type="button"
                    className="drawer-item"
                    onClick={() => addToPlaylist(playlist._id)}
                  >
                    <span className="drawer-item-name">
                      {playlist.isLikedSongs ? '♥ ' : ''}
                      {playlist.name}
                    </span>
                    <span className="drawer-item-count">
                      {playlist.songs?.length || 0}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {!loading && playlists.length === 0 && (
              <p className="hint">Няма плейлисти. Създай от менюто Плейлисти.</p>
            )}
          </aside>
        </>
      )}
    </PlaylistPickerContext.Provider>
  );
}

export function usePlaylistPicker() {
  const context = useContext(PlaylistPickerContext);
  if (!context) {
    throw new Error('usePlaylistPicker трябва да е в PlaylistPickerProvider');
  }
  return context;
}
