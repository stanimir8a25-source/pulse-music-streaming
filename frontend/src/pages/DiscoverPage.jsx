import { useEffect, useState } from 'react';
import { apiRequest, getToken } from '../api';
import { useAuth } from '../context/AuthContext';
import SongList from '../components/SongList';

export default function DiscoverPage({ onOpenNowPlaying }) {
  const { user } = useAuth();
  const [songs, setSongs] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [reason, setReason] = useState('');
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [artist, setArtist] = useState('');
  const [error, setError] = useState('');

  async function loadCatalog(params = {}) {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.genre) query.set('genre', params.genre);
    if (params.artist) query.set('artist', params.artist);

    const hasSearch = query.toString().length > 0;
    const path = hasSearch ? `/api/songs/search?${query}` : '/api/songs';
    const data = await apiRequest(path);
    setSongs(data.songs || []);
  }

  async function loadRecommendations() {
    if (!getToken()) {
      setRecommended([]);
      setReason('');
      return;
    }
    try {
      const data = await apiRequest('/api/songs/recommendations');
      setRecommended(data.songs || []);
      setReason(data.reason || '');
    } catch {
      setRecommended([]);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        await loadCatalog();
        await loadRecommendations();
      } catch (err) {
        setError(err.message);
      }
    }
    init();
  }, [user]);

  async function handleSearch(e) {
    e.preventDefault();
    setError('');
    try {
      await loadCatalog({ q, genre, artist });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleClear() {
    setQ('');
    setGenre('');
    setArtist('');
    setError('');
    try {
      await loadCatalog();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      {user && (
        <section className="panel soft">
          <div className="section-head">
            <h2>Препоръчани за теб</h2>
            <p className="hint">{reason}</p>
          </div>
          <SongList
            songs={recommended}
            variant="cards"
            emptyText="Още няма препоръки. Послушай няколко песни."
            showAdd
            onOpenNowPlaying={onOpenNowPlaying}
          />
        </section>
      )}

      <section className="panel soft">
        <div className="section-head">
          <h2>Открий музика</h2>
          <p className="hint">Търси по заглавие, жанр или изпълнител.</p>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            className="search-main"
            placeholder="Какво искаш да чуеш?"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            placeholder="Жанр"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          />
          <input
            placeholder="Изпълнител"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Търси
          </button>
          <button type="button" className="btn-ghost" onClick={handleClear}>
            Изчисти
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <SongList
          songs={songs}
          emptyText="Няма намерени песни."
          showAdd={Boolean(user)}
          onOpenNowPlaying={onOpenNowPlaying}
        />
      </section>
    </div>
  );
}
