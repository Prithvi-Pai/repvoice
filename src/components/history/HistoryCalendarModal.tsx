'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, X, Check, RotateCcw } from 'lucide-react';
import { getLocalDateKey, formatLocalDateLabel } from '@/lib/history/dateGrouping';

interface HistoryCalendarModalProps {
  currentSelectedDateKey: string | null;
  onSelectDate: (dateKey: string | null) => void;
  onClose: () => void;
}

export function HistoryCalendarModal({
  currentSelectedDateKey,
  onSelectDate,
  onClose,
}: HistoryCalendarModalProps) {
  const todayKey = getLocalDateKey(new Date());
  const [chosenDate, setChosenDate] = useState<string>(currentSelectedDateKey || todayKey);

  const handleApply = () => {
    onSelectDate(chosenDate);
    onClose();
  };

  const handleResetToDefault = () => {
    onSelectDate(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/30 flex items-center justify-center">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-lime-400 block">
                DATE FILTER
              </span>
              <h3 className="text-base font-black text-white">Select Past Date</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Date Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 block">
            Choose calendar day:
          </label>
          <input
            type="date"
            max={todayKey}
            value={chosenDate}
            onChange={(e) => setChosenDate(e.target.value)}
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-sm text-white focus:outline-none focus:border-lime-400 font-mono"
          />
          <p className="text-[11px] text-zinc-500">
            Selected: <span className="text-zinc-300 font-semibold">{formatLocalDateLabel(chosenDate)}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={handleApply}
            className="w-full py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-[0_0_15px_rgba(163,230,53,0.25)]"
          >
            <Check className="h-4 w-4 stroke-[3]" />
            <span>Show Workouts for this Date</span>
          </button>

          {currentSelectedDateKey && (
            <button
              onClick={handleResetToDefault}
              className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-zinc-750"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Back to Today & Yesterday</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
