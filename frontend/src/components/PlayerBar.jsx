import { fileUrl } from '../api';
import { usePlayer } from '../context/PlayerContext';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PlayerBar({ onOpenNowPlaying }) {
  const {
    currentSong,
    isPlaying,
    repeat,
    currentTime,
    duration,
    bars,
    togglePlay,
    playNext,
    playPrev,
    seek,
    cycleRepeat,
    closePlayer,
  } = usePlayer();

  if (!currentSong) {
    return null;
  }

  const max = duration || currentSong.duration || 0;
  const repeatLabel =
    repeat === 'off' ? 'Без повторение' : repeat === 'all' ? 'Повтори всички' : 'Повтори една';

  return (
    <footer className="player-bar">
      <button
        type="button"
        className="player-meta player-meta-btn"
        onClick={onOpenNowPlaying}
        title="Отвори песента"
      >
        {currentSong.coverPath ? (
          <img src={fileUrl(currentSong.coverPath)} alt="" />
        ) : (
          <div className="cover-placeholder small" />
        )}
        <div>
          <strong>{currentSong.title}</strong>
          <span>{currentSong.artistName}</span>
        </div>
      </button>

      <div className="player-controls">
        <div className="player-buttons">
          <button type="button" onClick={playPrev} title="Предишна" aria-label="Предишна">
            ‹‹
          </button>
          <button
            type="button"
            className="play-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Пауза' : 'Пусни'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button type="button" onClick={playNext} title="Следваща" aria-label="Следваща">
            ››
          </button>
          <button
            type="button"
            className={repeat !== 'off' ? 'active-repeat' : ''}
            onClick={cycleRepeat}
            title={repeatLabel}
          >
            {repeat === 'one' ? '↻1' : '↻'}
          </button>
        </div>

        <div className="player-progress">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={max}
            step="0.1"
            value={Math.min(currentTime, max)}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <span>{formatTime(max)}</span>
        </div>
      </div>

      <div className="player-right">
        <div className="visualizer" aria-hidden="true">
          {bars.map((value, index) => (
            <span
              key={index}
              style={{ transform: `scaleY(${Math.max(0.08, value)})` }}
            />
          ))}
        </div>
        <button
          type="button"
          className="player-close"
          onClick={closePlayer}
          title="Затвори плеъра"
          aria-label="Затвори песента"
        >
          ×
        </button>
      </div>
    </footer>
  );
}
