import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import SongList from '../components/SongList';
import { usePlayer } from '../context/PlayerContext';

export default function PlaylistsPage({ onOpenNowPlaying }) {
  const { playSong } = usePlayer();
  const [playlists, setPlaylists] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = playlists.find((p) => p._id === selectedId) || null;

  async function load() {
    const data = await apiRequest('/api/playlists');
    const list = data.playlists || [];
    setPlaylists(list);

    if (!list.length) {
      setSelectedId('');
      return;
    }

    if (!list.some((p) => p._id === selectedId)) {
      const liked = list.find((p) => p.isLikedSongs);
      setSelectedId(liked ? liked._id : list[0]._id);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const data = await apiRequest('/api/playlists', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setName('');
      setMessage(data.message);
      await load();
      if (data.playlist) {
        setSelectedId(data.playlist._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePlaylist() {
    if (!selected || selected.isLikedSongs) return;
    if (!window.confirm(`Изтрий плейлист „${selected.name}“?`)) return;

    try {
      await apiRequest(`/api/playlists/${selected._id}`, { method: 'DELETE' });
      setMessage('Плейлистът е изтрит.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveSong(song) {
    if (!selected) return;
    try {
      const data = await apiRequest(
        `/api/playlists/${selected._id}/songs/${song._id}`,
        { method: 'DELETE' }
      );
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel soft">
      <div className="section-head">
        <h2>Моите плейлисти</h2>
        <p className="hint">Liked Songs е твоят основен албум с харесани песни.</p>
      </div>

      <form className="search-form" onSubmit={handleCreate}>
        <input
          placeholder="Име на нов плейлист"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Създаване...' : 'Създай'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {playlists.length === 0 ? (
        <p className="hint">Още нямаш плейлисти.</p>
      ) : (
        <>
          <div className="playlist-picker">
            {playlists.map((playlist) => (
              <button
                key={playlist._id}
                type="button"
                className={playlist._id === selectedId ? 'chip active' : 'chip'}
                onClick={() => setSelectedId(playlist._id)}
              >
                {playlist.isLikedSongs ? '♥ ' : ''}
                {playlist.name} ({playlist.songs?.length || 0})
              </button>
            ))}
          </div>

          {selected && (
            <div className="playlist-detail">
              <div className="playlist-toolbar">
                <h3>
                  {selected.isLikedSongs ? '♥ ' : ''}
                  {selected.name}
                </h3>
                <div className="song-actions">
                  <button
                    type="button"
                    className="tiny-btn"
                    disabled={!selected.songs?.length}
                    onClick={() => {
                      if (selected.songs?.length) {
                        playSong(selected.songs[0], selected.songs);
                        if (onOpenNowPlaying) onOpenNowPlaying();
                      }
                    }}
                  >
                    ▶ Пусни всички
                  </button>
                  {!selected.isLikedSongs && (
                    <button
                      type="button"
                      className="tiny-btn danger"
                      onClick={handleDeletePlaylist}
                    >
                      Изтрий
                    </button>
                  )}
                </div>
              </div>

              <SongList
                songs={selected.songs || []}
                emptyText="Този плейлист е празен. Добави песни с бутона +."
                onRemove={handleRemoveSong}
                showAdd={false}
                onOpenNowPlaying={onOpenNowPlaying}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
