import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { API_URL, apiRequest, getToken } from '../api';

const PlayerContext = createContext(null);

export function streamUrl(songId) {
  return `${API_URL}/api/songs/${songId}/stream`;
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceConnectedRef = useRef(false);
  const rafRef = useRef(0);
  const repeatRef = useRef('off');
  const queueRef = useRef([]);
  const indexRef = useRef(-1);

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeat, setRepeat] = useState('off'); // off | one | all
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bars, setBars] = useState(() => Array(16).fill(0));

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;

  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  const ensureWebAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new Ctx();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 32;
    }

    if (!sourceConnectedRef.current) {
      const source = audioCtxRef.current.createMediaElementSource(audio);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioCtxRef.current.destination);
      sourceConnectedRef.current = true;
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const stopBars = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const tickBars = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      analyser.getByteFrequencyData(data);
      // Взимаме част от честотите за визуализацията
      const next = Array.from({ length: 16 }, (_, i) => {
        const value = data[i] || 0;
        return value / 255;
      });
      setBars(next);
      rafRef.current = requestAnimationFrame(draw);
    };

    stopBars();
    rafRef.current = requestAnimationFrame(draw);
  }, [stopBars]);

  const recordPlay = useCallback(async (songId) => {
    if (!getToken()) return;
    try {
      await apiRequest(`/api/songs/${songId}/play`, { method: 'POST' });
    } catch {
      // Не спираме плеъра, ако статистиката се провали
    }
  }, []);

  const playAtIndex = useCallback(
    async (index, list = queueRef.current) => {
      const audio = audioRef.current;
      const song = list[index];
      if (!audio || !song) return;

      ensureWebAudio();
      audio.src = streamUrl(song._id);
      audio.load();

      try {
        await audio.play();
        setIsPlaying(true);
        tickBars();
        recordPlay(song._id);
      } catch (err) {
        console.error('Play failed:', err);
        setIsPlaying(false);
        stopBars();
      }
    },
    [ensureWebAudio, recordPlay, stopBars, tickBars]
  );

  const playNext = useCallback(() => {
    const list = queueRef.current;
    const index = indexRef.current;
    if (!list.length) return;

    if (repeatRef.current === 'one') {
      playAtIndex(index, list);
      return;
    }

    const next = index + 1;
    if (next < list.length) {
      setCurrentIndex(next);
      playAtIndex(next, list);
      return;
    }

    if (repeatRef.current === 'all') {
      setCurrentIndex(0);
      playAtIndex(0, list);
      return;
    }

    setIsPlaying(false);
    stopBars();
  }, [playAtIndex, stopBars]);

  const playPrev = useCallback(() => {
    const audio = audioRef.current;
    const list = queueRef.current;
    const index = indexRef.current;
    if (!audio || !list.length) return;

    // Ако сме след 3-та секунда — рестарт на текущата
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const prev = index - 1;
    if (prev >= 0) {
      setCurrentIndex(prev);
      playAtIndex(prev, list);
    } else if (repeatRef.current === 'all') {
      const last = list.length - 1;
      setCurrentIndex(last);
      playAtIndex(last, list);
    } else {
      audio.currentTime = 0;
    }
  }, [playAtIndex]);

  // Създаваме audio елемента веднъж — затова музиката не спира при смяна на страница
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => playNext();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      stopBars();
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [playNext, stopBars]);

  function playSong(song, list = null) {
    const nextQueue = list && list.length ? list : [song];
    const index = nextQueue.findIndex((item) => item._id === song._id);
    const safeIndex = index >= 0 ? index : 0;

    setQueue(nextQueue);
    queueRef.current = nextQueue;
    setCurrentIndex(safeIndex);
    indexRef.current = safeIndex;
    playAtIndex(safeIndex, nextQueue);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    ensureWebAudio();

    if (audio.paused) {
      audio.play().then(() => {
        setIsPlaying(true);
        tickBars();
      });
    } else {
      audio.pause();
      setIsPlaying(false);
      stopBars();
    }
  }

  function seek(seconds) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = seconds;
  }

  function cycleRepeat() {
    setRepeat((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }

  function closePlayer() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    stopBars();
    setIsPlaying(false);
    setQueue([]);
    queueRef.current = [];
    setCurrentIndex(-1);
    indexRef.current = -1;
    setCurrentTime(0);
    setDuration(0);
  }

  return (
    <PlayerContext.Provider
      value={{
        queue,
        currentSong,
        currentIndex,
        isPlaying,
        repeat,
        currentTime,
        duration,
        bars,
        playSong,
        togglePlay,
        playNext,
        playPrev,
        seek,
        cycleRepeat,
        closePlayer,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer трябва да се ползва вътре в PlayerProvider');
  }
  return context;
}
