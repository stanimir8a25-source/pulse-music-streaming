export default function HomePage({ onNavigate, user }) {
  return (
    <section className="intro-page">
      <div className="intro-bg" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>

      <div className="intro-content">
        <p className="intro-brand">Pulse</p>
        <h1>Музика за всеки момент</h1>
        <p className="intro-lead">
          Lite стрийминг платформа с плеър, плейлисти, препоръки и студио за артисти.
        </p>

        <div className="intro-actions">
          <button
            type="button"
            className="btn-primary intro-cta"
            onClick={() => onNavigate('discover')}
          >
            Започни да слушаш
          </button>

          {!user ? (
            <button
              type="button"
              className="btn-ghost intro-cta"
              onClick={() => onNavigate('register')}
            >
              Създай акаунт
            </button>
          ) : (
            <button
              type="button"
              className="btn-ghost intro-cta"
              onClick={() => onNavigate('playlists')}
            >
              Моите плейлисти
            </button>
          )}
        </div>

      </div>
    </section>
  );
}
