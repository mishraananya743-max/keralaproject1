import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface Scene {
  image: string;
  alt: string;
  voiceover: string;
  duration: number;
  zoom: 'in' | 'out';
}

const scenes: Scene[] = [
  {
    image: 'https://images.pexels.com/photos/36483810/pexels-photo-36483810.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A diverse group of smiling Indian citizens standing together in a sunny public park with a sanitation worker',
    voiceover: 'Let\'s keep our city clean.',
    duration: 2000,
    zoom: 'in',
  },
  {
    image: 'https://images.pexels.com/photos/7513223/pexels-photo-7513223.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A smiling woman in a traditional saree sorting waste into green and blue bins in a modern kitchen',
    voiceover: 'Separate your wet waste every day.',
    duration: 2000,
    zoom: 'out',
  },
  {
    image: 'https://images.pexels.com/photos/10438560/pexels-photo-10438560.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A sanitation worker in uniform and high-vis vest pulling a green wheeled bin down a residential street',
    voiceover: 'The garbage van is here in your society.',
    duration: 2000,
    zoom: 'in',
  },
  {
    image: 'https://images.pexels.com/photos/14377465/pexels-photo-14377465.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Cheerful teenagers and young students painting a colorful community mural with green leaves and nature',
    voiceover: 'This is our duty as citizens.',
    duration: 2000,
    zoom: 'out',
  },
  {
    image: 'https://images.pexels.com/photos/6647013/pexels-photo-6647013.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'Residents and sanitation workers working together collecting garbage bags and sorting items into green bins',
    voiceover: 'Together for a cleaner tomorrow.',
    duration: 2000,
    zoom: 'in',
  },
];

const TOTAL_DURATION = scenes.reduce((sum, s) => sum + s.duration, 0);

export function DashboardVideo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, mute: boolean) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (mute) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 1;
    u.volume = 1;
    utterRef.current = u;
    window.speechSynthesis.speak(u);
  }, []);

  const stopSpeech = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  const tick = useCallback((now: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = now;
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;
    setElapsed((prev) => {
      const next = prev + delta;
      if (next >= TOTAL_DURATION) {
        setIsPlaying(false);
        stopSpeech();
        return TOTAL_DURATION;
      }
      let acc = 0;
      for (let i = 0; i < scenes.length; i++) {
        acc += scenes[i].duration;
        if (next < acc) {
          setCurrentIndex((prevIdx) => {
            if (prevIdx !== i) {
              speak(scenes[i].voiceover, muted);
            }
            return i;
          });
          break;
        }
      }
      return next;
    });
    rafRef.current = requestAnimationFrame(tick);
  }, [muted, speak, stopSpeech]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
      speak(scenes[currentIndex].voiceover, muted);
    } else {
      cancelAnimationFrame(rafRef.current);
      stopSpeech();
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      stopSpeech();
    };
  }, [isPlaying]);

  useEffect(() => {
    return () => stopSpeech();
  }, [stopSpeech]);

  function togglePlay() {
    if (elapsed >= TOTAL_DURATION) {
      setElapsed(0);
      setCurrentIndex(0);
    }
    setIsPlaying((p) => !p);
  }

  function restart() {
    setElapsed(0);
    setCurrentIndex(0);
    setIsPlaying(true);
  }

  function toggleMute() {
    setMuted((m) => {
      const newMuted = !m;
      if (newMuted) stopSpeech();
      else if (isPlaying) speak(scenes[currentIndex].voiceover, false);
      return newMuted;
    });
  }

  function seekTo(percent: number) {
    const newElapsed = Math.max(0, Math.min(TOTAL_DURATION, percent * TOTAL_DURATION));
    setElapsed(newElapsed);
    let acc = 0;
    for (let i = 0; i < scenes.length; i++) {
      acc += scenes[i].duration;
      if (newElapsed < acc) {
        setCurrentIndex(i);
        break;
      }
    }
  }

  const progress = (elapsed / TOTAL_DURATION) * 100;
  const currentScene = scenes[currentIndex];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl group">
      {/* Video viewport */}
      <div className="relative aspect-video overflow-hidden">
        {scenes.map((scene, idx) => (
          <div
            key={idx}
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: idx === currentIndex ? 1 : 0,
              zIndex: idx === currentIndex ? 1 : 0,
            }}
          >
            <img
              src={scene.image}
              alt={scene.alt}
              className={`w-full h-full object-cover ${
                idx === currentIndex && isPlaying
                  ? scene.zoom === 'in'
                    ? 'animate-kenburns-in'
                    : 'animate-kenburns-out'
                  : ''
              }`}
              style={{ filter: 'brightness(0.85)' }}
            />
          </div>
        ))}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

        {/* Voiceover caption */}
        <div
          key={currentIndex}
          className="absolute bottom-16 left-0 right-0 px-6 text-center animate-caption-in"
        >
          <p className="inline-block text-white text-lg sm:text-2xl font-semibold tracking-wide drop-shadow-lg">
            "{currentScene.voiceover}"
          </p>
        </div>

        {/* Scene indicator dots */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
          {scenes.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                setElapsed(scenes.slice(0, idx).reduce((s, sc) => s + sc.duration, 0));
                speak(scenes[idx].voiceover, muted);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'w-8 bg-teal-400' : 'w-1.5 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        {/* Center play button overlay */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors"
          >
            <div className="w-20 h-20 rounded-full bg-teal-600/90 hover:bg-teal-500 flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all">
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </div>
          </button>
        )}
      </div>

      {/* Control bar */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-2 bg-gradient-to-t from-black/80 to-transparent">
        {/* Progress bar */}
        <div
          className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group/bar"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo((e.clientX - rect.left) / rect.width);
          }}
        >
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="text-white hover:text-teal-400 transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
          </button>
          <button
            onClick={restart}
            className="text-white/80 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleMute}
            className="text-white/80 hover:text-white transition-colors"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <span className="text-xs text-white/60 font-mono ml-auto">
            {Math.floor(elapsed / 1000).toString().padStart(2, '0')}:{String(Math.floor((elapsed % 1000) / 10)).padStart(2, '0')}
            {' / '}
            {Math.floor(TOTAL_DURATION / 1000).toString().padStart(2, '0')}:{String(Math.floor((TOTAL_DURATION % 1000) / 10)).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}
