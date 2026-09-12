import { useEffect, useState } from 'react';
import { apiRequest } from '../api';

const ROLE_LABELS = {
  listener: 'Слушател',
  artist: 'Артист',
  admin: 'Админ',
};

export default function AdminPage() {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [songs, setSongs] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [statsData, songsData, usersData] = await Promise.all([
        apiRequest('/api/admin/stats'),
        apiRequest('/api/admin/songs'),
        apiRequest('/api/admin/users'),
      ]);
      setStats(statsData.stats);
      setSongs(songsData.songs || []);
      setUsers(usersData.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function toggleVisibility(song) {
    try {
      const data = await apiRequest(`/api/admin/songs/${song._id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ isHidden: !song.isHidden }),
      });
      setMessage(data.message);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteSong(song) {
    if (!window.confirm(`Изтрий завинаги „${song.title}“?`)) return;
    try {
      const data = await apiRequest(`/api/admin/songs/${song._id}`, {
        method: 'DELETE',
      });
      setMessage(data.message);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeRole(userId, role) {
    try {
      const data = await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setMessage(data.message);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Изтрий потребител „${user.username}“?`)) return;
    try {
      const data = await apiRequest(`/api/admin/users/${user._id}`, {
        method: 'DELETE',
      });
      setMessage(data.message);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <p>Зареждане на админ панела...</p>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>Admin Panel</h2>
        <p className="hint">Модерация, статистика и управление на потребители.</p>

        <div className="playlist-picker">
          <button
            type="button"
            className={tab === 'stats' ? 'chip active' : 'chip'}
            onClick={() => setTab('stats')}
          >
            Статистика
          </button>
          <button
            type="button"
            className={tab === 'songs' ? 'chip active' : 'chip'}
            onClick={() => setTab('songs')}
          >
            Песни
          </button>
          <button
            type="button"
            className={tab === 'users' ? 'chip active' : 'chip'}
            onClick={() => setTab('users')}
          >
            Потребители
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
      </section>

      {tab === 'stats' && stats && (
        <section className="panel">
          <h3>Глобална статистика</h3>
          <div className="stats-grid">
            <div className="stat-box">
              <strong>{stats.usersCount}</strong>
              <span>Потребители</span>
            </div>
            <div className="stat-box">
              <strong>{stats.songsCount}</strong>
              <span>Песни</span>
            </div>
            <div className="stat-box">
              <strong>{stats.playlistsCount}</strong>
              <span>Плейлисти</span>
            </div>
            <div className="stat-box">
              <strong>{stats.hiddenCount}</strong>
              <span>Скрити песни</span>
            </div>
          </div>

          <p className="hint">
            Роли: слушатели {stats.roles.listener || 0} · артисти{' '}
            {stats.roles.artist || 0} · админи {stats.roles.admin || 0}
          </p>

          <h3>Най-слушани песни</h3>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Заглавие</th>
                  <th>Изпълнител</th>
                  <th>Жанр</th>
                  <th>Слушания</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {stats.topSongs.map((song, index) => (
                  <tr key={song._id}>
                    <td>{index + 1}</td>
                    <td>{song.title}</td>
                    <td>{song.artistName}</td>
                    <td>{song.genre}</td>
                    <td>{song.playCount}</td>
                    <td>{song.isHidden ? 'Скрита' : 'Видима'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'songs' && (
        <section className="panel">
          <h3>Модерация на песни</h3>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Заглавие</th>
                  <th>Изпълнител</th>
                  <th>Жанр</th>
                  <th>Слушания</th>
                  <th>Качил</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((song) => (
                  <tr key={song._id} className={song.isHidden ? 'row-hidden' : ''}>
                    <td>{song.title}</td>
                    <td>{song.artistName}</td>
                    <td>{song.genre}</td>
                    <td>{song.playCount}</td>
                    <td>{song.uploadedBy?.username || '—'}</td>
                    <td>{song.isHidden ? 'Скрита' : 'Видима'}</td>
                    <td>
                      <div className="song-actions">
                        <button
                          type="button"
                          className="tiny-btn"
                          onClick={() => toggleVisibility(song)}
                        >
                          {song.isHidden ? 'Покажи' : 'Скрий'}
                        </button>
                        <button
                          type="button"
                          className="tiny-btn danger"
                          onClick={() => deleteSong(song)}
                        >
                          Изтрий
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'users' && (
        <section className="panel">
          <h3>Управление на потребители</h3>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Роля</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user._id, e.target.value)}
                      >
                        <option value="listener">{ROLE_LABELS.listener}</option>
                        <option value="artist">{ROLE_LABELS.artist}</option>
                        <option value="admin">{ROLE_LABELS.admin}</option>
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="tiny-btn danger"
                        onClick={() => deleteUser(user)}
                      >
                        Изтрий
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
