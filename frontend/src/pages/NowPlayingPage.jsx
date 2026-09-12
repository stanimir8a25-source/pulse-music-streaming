import { fileUrl } from '../api';
import { usePlayer } from '../context/PlayerContext';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function NowPlayingPage({ onBack }) {
  const {
    currentSong,
    isPlaying,
    repeat,
    currentTime,
    duration,
    togglePlay,
    playNext,
    playPrev,
    seek,
    cycleRepeat,
  } = usePlayer();

  if (!currentSong) {
    return (
      <section className="now-playing empty">
        <p className="hint">Няма избрана песен.</p>
        <button type="button" className="btn-primary" onClick={onBack}>
          Назад
        </button>
      </section>
    );
  }

  const max = duration || currentSong.duration || 0;

  return (
    <section className="now-playing">
      <button type="button" className="now-back" onClick={onBack}>
        ↓ Назад
      </button>

      <div className="now-art-wrap">
        {currentSong.coverPath ? (
          <img
            className={`now-art ${isPlaying ? 'spinning' : ''}`}
            src={fileUrl(currentSong.coverPath)}
            alt=""
          />
        ) : (
          <div className={`now-art cover-placeholder ${isPlaying ? 'spinning' : ''}`} />
        )}
      </div>

      <div className="now-info">
        <h1>{currentSong.title}</h1>
        <p>{currentSong.artistName}</p>
      </div>

      <div className="now-progress">
        <input
          type="range"
          min="0"
          max={max}
          step="0.1"
          value={Math.min(currentTime, max)}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <div className="now-times">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(max)}</span>
        </div>
      </div>

      <div className="now-controls">
        <button type="button" onClick={playPrev} aria-label="Предишна">
          ‹‹
        </button>
        <button
          type="button"
          className="now-play"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Пауза' : 'Пусни'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button type="button" onClick={playNext} aria-label="Следваща">
          ››
        </button>
        <button
          type="button"
          className={repeat !== 'off' ? 'active-repeat' : ''}
          onClick={cycleRepeat}
        >
          {repeat === 'one' ? '↻1' : '↻'}
        </button>
      </div>
    </section>
  );
}
