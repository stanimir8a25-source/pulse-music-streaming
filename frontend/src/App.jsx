import { useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { PlaylistPickerProvider } from './context/PlaylistPickerContext';
import PlayerBar from './components/PlayerBar';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudioPage from './pages/StudioPage';
import PlaylistsPage from './pages/PlaylistsPage';
import AdminPage from './pages/AdminPage';
import NowPlayingPage from './pages/NowPlayingPage';
import { fileUrl } from './api';
import './App.css';

const ROLE_LABELS = {
  listener: 'Слушател',
  artist: 'Артист',
  admin: 'Админ',
};

const VALID_PAGES = new Set([
  'home',
  'discover',
  'playlists',
  'studio',
  'admin',
  'login',
  'register',
  'nowplaying',
]);

function readPageFromUrl() {
  const hash = window.location.hash.replace(/^#/, '');
  return VALID_PAGES.has(hash) ? hash : 'home';
}

function AppShell() {
  const { user, loading, logout, uploadAvatar } = useAuth();
  const [page, setPage] = useState(readPageFromUrl);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef(null);
  const pageRef = useRef(page);
  // От коя страница сме влезли в режим плейър
  const returnToRef = useRef('discover');

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    // Запазваме текущата страница в history, без да трием предишни записи ненужно
    if (!window.history.state?.pulse) {
      window.history.replaceState(
        { pulse: true, page: pageRef.current },
        '',
        `#${pageRef.current}`
      );
    }

    function onPopState(event) {
      const wasNowPlaying = pageRef.current === 'nowplaying';
      const state = event.state;

      // Назад от плейър режима → винаги към последната страница В САЙТА
      if (wasNowPlaying) {
        const returnTo =
          returnToRef.current &&
          VALID_PAGES.has(returnToRef.current) &&
          returnToRef.current !== 'nowplaying'
            ? returnToRef.current
            : 'discover';

        setPage(returnTo);
        pageRef.current = returnTo;
        setSidebarOpen(false);

        // Ако браузърът е излязъл извън сайта (няма pulse state),
        // веднага се връщаме в приложението на returnTo страницата.
        if (!state?.pulse) {
          window.history.pushState(
            { pulse: true, page: returnTo },
            '',
            `#${returnTo}`
          );
        } else if (state.page !== returnTo) {
          window.history.replaceState(
            { pulse: true, page: returnTo },
            '',
            `#${returnTo}`
          );
        }
        return;
      }

      if (state?.pulse && VALID_PAGES.has(state.page)) {
        setPage(state.page);
        pageRef.current = state.page;
        setSidebarOpen(false);
        return;
      }

      // Опит за излизане от сайта → оставаме на текущата страница
      window.history.pushState(
        { pulse: true, page: pageRef.current },
        '',
        `#${pageRef.current}`
      );
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function go(name, options = {}) {
    const { replace = false } = options;
    if (!VALID_PAGES.has(name)) return;

    // Запомняме откъде влизаме в плейъра
    if (name === 'nowplaying' && pageRef.current !== 'nowplaying') {
      returnToRef.current =
        pageRef.current !== 'nowplaying' ? pageRef.current : 'discover';
    }

    setPage(name);
    setSidebarOpen(false);
    pageRef.current = name;

    const state = {
      pulse: true,
      page: name,
      ...(name === 'nowplaying' ? { returnTo: returnToRef.current } : {}),
    };
    const url = `#${name}`;

    if (replace) {
      window.history.replaceState(state, '', url);
    } else {
      window.history.pushState(state, '', url);
    }
  }

  function leaveNowPlaying() {
    const returnTo =
      returnToRef.current &&
      VALID_PAGES.has(returnToRef.current) &&
      returnToRef.current !== 'nowplaying'
        ? returnToRef.current
        : 'discover';

    setPage(returnTo);
    pageRef.current = returnTo;
    setSidebarOpen(false);
    // Заменяме записа на плейъра, за да не се връщаме пак в него с още едно "назад"
    window.history.replaceState(
      { pulse: true, page: returnTo },
      '',
      `#${returnTo}`
    );
  }

  if (loading) {
    return (
      <div className="app boot-screen">
        <div className="boot-logo">Pulse</div>
        <p>Зареждане...</p>
      </div>
    );
  }

  const canUseStudio = user && (user.role === 'artist' || user.role === 'admin');
  const isAdmin = user && user.role === 'admin';
  const isIntro = page === 'home';
  const isNowPlaying = page === 'nowplaying';

  function navClass(name) {
    return page === name ? 'side-link active' : 'side-link';
  }

  async function onAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');
    try {
      await uploadAvatar(file);
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div
      className={`app has-player ${isIntro ? 'intro-mode' : ''} ${
        isNowPlaying ? 'nowplaying-mode' : ''
      }`}
    >
      <div className="shell">
        {!isNowPlaying && (
          <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-brand">
              <span className="logo-mark" aria-hidden="true" />
              <div>
                <p className="brand">Pulse</p>
                <p className="sub">Музикална стрийминг платформа</p>
              </div>
            </div>

            <nav className="side-nav">
              <button type="button" className={navClass('home')} onClick={() => go('home')}>
                <span className="side-icon">⌂</span>
                Начало
              </button>

              <button
                type="button"
                className={navClass('discover')}
                onClick={() => go('discover')}
              >
                <span className="side-icon">⌕</span>
                Открий
              </button>

              {user && (
                <button
                  type="button"
                  className={navClass('playlists')}
                  onClick={() => go('playlists')}
                >
                  <span className="side-icon">☰</span>
                  Плейлисти
                </button>
              )}

              {canUseStudio && (
                <button
                  type="button"
                  className={navClass('studio')}
                  onClick={() => go('studio')}
                >
                  <span className="side-icon">♫</span>
                  Studio
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  className={navClass('admin')}
                  onClick={() => go('admin')}
                >
                  <span className="side-icon">⚙</span>
                  Admin
                </button>
              )}
            </nav>

            <div className="sidebar-foot">
              {!user ? (
                <div className="auth-actions">
                  <button type="button" className="btn-primary" onClick={() => go('login')}>
                    Вход
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => go('register')}>
                    Регистрация
                  </button>
                </div>
              ) : (
                <div className="user-chip">
                  <button
                    type="button"
                    className="avatar-btn"
                    title="Смени профилна снимка"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {user.avatarPath ? (
                      <img src={fileUrl(user.avatarPath)} alt="" className="avatar-img" />
                    ) : (
                      <span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onAvatarChange}
                  />
                  <div className="user-meta">
                    <strong>{user.username}</strong>
                    <span>{ROLE_LABELS[user.role] || user.role}</span>
                    {avatarError && <span className="error">{avatarError}</span>}
                  </div>
                  <button
                    type="button"
                    className="btn-ghost small"
                    onClick={() => {
                      logout();
                      go('home', { replace: true });
                    }}
                  >
                    Изход
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}

        {sidebarOpen && !isNowPlaying && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Затвори менюто"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="content-column">
          {!isNowPlaying && (
            <button
              type="button"
              className="menu-toggle floating-menu"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Меню"
            >
              ☰
            </button>
          )}

          <main
            className={`main ${isIntro ? 'main-intro' : ''} ${
              isNowPlaying ? 'main-now' : ''
            }`}
          >
            {page === 'home' && <HomePage user={user} onNavigate={go} />}
            {page === 'discover' && (
              <DiscoverPage onOpenNowPlaying={() => go('nowplaying')} />
            )}
            {page === 'playlists' && user && (
              <PlaylistsPage onOpenNowPlaying={() => go('nowplaying')} />
            )}
            {page === 'nowplaying' && (
              <NowPlayingPage onBack={leaveNowPlaying} />
            )}
            {page === 'admin' && isAdmin && <AdminPage />}
            {page === 'login' && (
              <LoginPage
                onSwitch={() => go('register')}
                onSuccess={() => go('discover')}
              />
            )}
            {page === 'register' && (
              <RegisterPage
                onSwitch={() => go('login')}
                onSuccess={() => go('discover')}
              />
            )}
            {page === 'studio' && canUseStudio && <StudioPage />}
            {page === 'studio' && !canUseStudio && (
              <section className="panel">
                <p className="error">Само артисти могат да ползват Studio.</p>
              </section>
            )}
          </main>
        </div>
      </div>

      {!isNowPlaying && (
        <PlayerBar onOpenNowPlaying={() => go('nowplaying')} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <PlaylistPickerProvider>
          <AppShell />
        </PlaylistPickerProvider>
      </PlayerProvider>
    </AuthProvider>
  );
}
