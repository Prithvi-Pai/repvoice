'use client';

import { useState, useEffect } from 'react';
import { Timer, X, Plus, Minus, Play, Pause, RotateCcw } from 'lucide-react';
import { formatDuration } from '@/lib/utils/cn';

interface RestTimerProps {
  onClose?: () => void;
}

export function RestTimer({ onClose }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [initialSeconds, setInitialSeconds] = useState<number>(60);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Audio tone when timer reaches 0
  const playChime = () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      playChime();
      setIsActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft]);

  const setPreset = (seconds: number) => {
    setInitialSeconds(seconds);
    setSecondsLeft(seconds);
    setIsActive(true);
  };

  const adjustTime = (delta: number) => {
    setSecondsLeft((s) => Math.max(0, s + delta));
  };

  const progress = initialSeconds > 0 ? ((initialSeconds - secondsLeft) / initialSeconds) * 100 : 0;

  return (
    <div className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-lime-400 font-bold text-sm tracking-wide">
          <Timer className="h-4 w-4 animate-pulse text-lime-400" />
          <span>Rest Timer</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center justify-center my-4">
        <div className="text-4xl font-black font-mono tracking-wider text-white">
          {formatDuration(secondsLeft)}
        </div>
        <div className="w-full bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-lime-400 h-full transition-all duration-300 shadow-[0_0_10px_rgba(163,230,53,0.5)]"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[30, 60, 90, 120].map((sec) => (
          <button
            key={sec}
            onClick={() => setPreset(sec)}
            className={`py-1.5 rounded-lg text-xs font-bold border transition ${
              initialSeconds === sec
                ? 'bg-lime-400/20 text-lime-400 border-lime-400/50 shadow-[0_0_10px_rgba(163,230,53,0.2)]'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            {sec}s
          </button>
        ))}
      </div>

      {/* Timer Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => adjustTime(-15)}
          className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:scale-95 border border-zinc-700"
          title="-15s"
        >
          <Minus className="h-4 w-4 font-bold" />
        </button>

        <button
          onClick={() => setIsActive(!isActive)}
          className="px-6 py-2.5 rounded-xl bg-lime-400 text-black font-extrabold text-sm flex items-center gap-1.5 shadow-[0_0_15px_rgba(163,230,53,0.3)] active:scale-95 transition"
        >
          {isActive ? <Pause className="h-4 w-4 fill-black" /> : <Play className="h-4 w-4 fill-black" />}
          <span>{isActive ? 'Pause' : 'Resume'}</span>
        </button>

        <button
          onClick={() => {
            setSecondsLeft(initialSeconds);
            setIsActive(true);
          }}
          className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:scale-95 border border-zinc-700"
          title="Restart"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          onClick={() => adjustTime(30)}
          className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:scale-95 border border-zinc-700"
          title="+30s"
        >
          <Plus className="h-4 w-4 font-bold" />
        </button>
      </div>
    </div>
  );
}
