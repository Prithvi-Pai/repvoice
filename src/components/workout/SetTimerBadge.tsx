'use client';

import React, { useState, useEffect } from 'react';
import { Timer, Check, X } from 'lucide-react';
import { ActiveSetTimerState, getElapsedSetSeconds, formatSetDuration } from '@/lib/voice/setTimerManager';

interface SetTimerBadgeProps {
  timer: ActiveSetTimerState | null;
  exerciseName?: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function SetTimerBadge({
  timer,
  exerciseName,
  onComplete,
  onCancel,
}: SetTimerBadgeProps) {
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  useEffect(() => {
    if (!timer || !timer.isRunning) {
      setElapsedSec(0);
      return;
    }

    setElapsedSec(getElapsedSetSeconds(timer));
    const interval = setInterval(() => {
      setElapsedSec(getElapsedSetSeconds(timer));
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  if (!timer || !timer.isRunning) return null;

  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs animate-in fade-in">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center animate-pulse">
          <Timer className="h-4 w-4" />
        </div>
        <div>
          <span className="font-bold text-[11px] uppercase tracking-wider text-amber-400 block">
            Set #{timer.setNumber} Active
          </span>
          <span className="text-zinc-300 text-xs font-mono font-bold">
            {exerciseName || 'Current Exercise'} • {formatSetDuration(elapsedSec)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition"
          title="Cancel set timer"
        >
          <X className="h-4 w-4" />
        </button>

        <button
          onClick={onComplete}
          className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs flex items-center gap-1 transition shadow-[0_0_12px_rgba(251,191,36,0.25)]"
          title="Say 'Set done' or click to complete"
        >
          <Check className="h-3.5 w-3.5 stroke-[3]" />
          <span>Complete</span>
        </button>
      </div>
    </div>
  );
}
