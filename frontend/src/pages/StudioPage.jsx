import { useEffect, useRef, useState } from 'react';
import { apiRequest, fileUrl } from '../api';
import { useAuth } from '../context/AuthContext';

function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function StudioPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '',
    featuredArtists: '',
    genre: '',
  });
  const [audio, setAudio] = useState(null);
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [detectedDuration, setDetectedDuration] = useState(0);
  const [mySongs, setMySongs] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const artistPreview = form.featuredArtists.trim()
    ? `${user?.username || ''} ft. ${form.featuredArtists.trim()}`
    : user?.username || '';

  async function loadMySongs() {
    try {
      const data = await apiRequest('/api/songs/my');
      setMySongs(data.songs || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadMySongs();
  }, []);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function onAudioPick(file) {
    setAudio(file || null);
    setDetectedDuration(0);
    if (!file) return;

    const url = URL.createObjectURL(file);
    const audioEl = new Audio();
    audioEl.preload = 'metadata';
    audioEl.src = url;
    audioEl.onloadedmetadata = () => {
      const sec = Math.max(1, Math.round(audioEl.duration || 0));
      if (Number.isFinite(sec)) setDetectedDuration(sec);
      URL.revokeObjectURL(url);
    };
    audioEl.onerror = () => {
      URL.revokeObjectURL(url);
      setDetectedDuration(0);
    };
  }

  function onCoverPick(file) {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCover(file || null);
    setCoverPreview(file ? URL.createObjectURL(file) : '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!audio) {
      setError('Избери MP3 файл.');
      return;
    }

    setBusy(true);

    try {
      const body = new FormData();
      body.append('title', form.title);
      body.append('genre', form.genre);
      body.append('featuredArtists', form.featuredArtists.trim());
      body.append('audio', audio);
      if (cover) body.append('cover', cover);

      await apiRequest('/api/songs', {
        method: 'POST',
        body,
      });

      setMessage('Песента е качена успешно!');
      setForm({ title: '', featuredArtists: '', genre: '' });
      setAudio(null);
      setCover(null);
      setCoverPreview('');
      setDetectedDuration(0);
      if (audioInputRef.current) audioInputRef.current.value = '';
      if (coverInputRef.current) coverInputRef.current.value = '';
      await loadMySongs();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel soft">
      <div className="section-head">
        <h2>Studio</h2>
        <p className="hint">Качи MP3 и обложка. Продължителността се взима от файла.</p>
      </div>

      <form className="form studio-form" onSubmit={handleSubmit}>
        <label>
          Заглавие
          <input
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            required
          />
        </label>

        <div className="artist-fields">
          <label>
            Изпълнител (твоят профил)
            <input value={user?.username || ''} disabled readOnly />
          </label>
          <label>
            Допълнителни изпълнители (по желание)
            <input
              value={form.featuredArtists}
              onChange={(e) => update('featuredArtists', e.target.value)}
              placeholder="напр. Guest Name"
            />
          </label>
          <p className="hint artist-preview">Ще се запише като: <strong>{artistPreview}</strong></p>
        </div>

        <label>
          Жанр
          <input
            value={form.genre}
            onChange={(e) => update('genre', e.target.value)}
            placeholder="напр. Pop, Rock, Jazz"
            required
          />
        </label>

        <div className="upload-row">
          <div className="upload-card">
            <input
              ref={audioInputRef}
              type="file"
              accept=".mp3,audio/mpeg"
              hidden
              onChange={(e) => onAudioPick(e.target.files[0] || null)}
            />
            <button
              type="button"
              className="upload-btn"
              onClick={() => audioInputRef.current?.click()}
            >
              <span className="upload-icon">♪</span>
              <strong>{audio ? 'Смени MP3' : 'Избери MP3'}</strong>
              <span className="upload-sub">
                {audio
                  ? `${audio.name}${detectedDuration ? ` · ${formatDuration(detectedDuration)}` : ''}`
                  : 'Само .mp3 файлове'}
              </span>
            </button>
          </div>

          <div className="upload-card">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onCoverPick(e.target.files[0] || null)}
            />
            <button
              type="button"
              className="upload-btn cover-upload"
              onClick={() => coverInputRef.current?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="" className="upload-cover-preview" />
              ) : (
                <span className="upload-icon">▣</span>
              )}
              <strong>{cover ? 'Смени обложка' : 'Избери обложка'}</strong>
              <span className="upload-sub">
                {cover ? cover.name : 'JPG, PNG и др.'}
              </span>
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Качване...' : 'Качи песен'}
        </button>
      </form>

      <div className="song-list">
        <h3>Моите песни</h3>
        {mySongs.length === 0 && <p className="hint">Още няма качени песни.</p>}
        <ul className="catalog">
          {mySongs.map((song) => (
            <li key={song._id} className="song-item song-item--studio">
              {song.coverPath ? (
                <img src={fileUrl(song.coverPath)} alt="" />
              ) : (
                <div className="cover-placeholder" />
              )}
              <div className="track-text">
                <strong>{song.title}</strong>
                <span>
                  {song.artistName} · {song.genre} · {formatDuration(song.duration)}
                </span>
                <span>Слушания: {song.playCount}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
