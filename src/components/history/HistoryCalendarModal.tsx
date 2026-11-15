'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Workout } from '@/types';
import { getLocalDateKey, formatLocalDateLabel } from '@/lib/history/dateGrouping';

interface HistoryCalendarModalProps {
  currentSelectedDateKey: string | null;
  workouts: Workout[];
  onSelectDate: (dateKey: string | null) => void;
  onClose: () => void;
}

export function HistoryCalendarModal({
  currentSelectedDateKey,
  workouts,
  onSelectDate,
  onClose,
}: HistoryCalendarModalProps) {
  const today = new Date();
  const todayKey = getLocalDateKey(today);

  // Parse initial view year and month from currentSelectedDateKey or today
  const initialDate = useMemo(() => {
    if (currentSelectedDateKey) {
      const [y, m, d] = currentSelectedDateKey.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m - 1, d);
      }
    }
    return today;
  }, [currentSelectedDateKey]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-11
  const [chosenDate, setChosenDate] = useState<string>(currentSelectedDateKey || todayKey);

  // Set of dates that have at least one completed workout
  const workoutDateKeys = useMemo(() => {
    const dates = new Set<string>();
    if (workouts && workouts.length > 0) {
      workouts.forEach((w) => {
        const key = getLocalDateKey(w.completedAt || w.startedAt);
        if (key) dates.add(key);
      });
    }
    return dates;
  }, [workouts]);

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Jump to today
  const handleJumpToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setChosenDate(todayKey);
  };

  // Month metadata
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
  });
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Days grid
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingArray = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const handleApply = () => {
    onSelectDate(chosenDate);
    onClose();
  };

  const handleClearFilter = () => {
    onSelectDate(null);
    onClose();
  };

  const weekDayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in font-sans">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white border border-zinc-750 flex items-center justify-center">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block leading-none">
                CALENDAR FILTER
              </span>
              <h3 className="text-sm font-extrabold text-white">Select Workout Date</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition border border-zinc-850"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Month & Year Navigation */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition border border-zinc-800"
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-sm font-extrabold text-white tracking-wide">
            {monthName} {viewYear}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition border border-zinc-800"
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekDayLabels.map((dayLabel, idx) => (
            <span
              key={idx}
              className="text-[11px] font-bold uppercase tracking-wider text-zinc-400"
            >
              {dayLabel}
            </span>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {paddingArray.map((_, idx) => (
            <div key={`pad-${idx}`} className="h-10" />
          ))}

          {/* Actual days */}
          {daysArray.map((day) => {
            const dateObj = new Date(viewYear, viewMonth, day);
            const dateKey = getLocalDateKey(dateObj);
            const isSelected = chosenDate === dateKey;
            const isToday = todayKey === dateKey;
            const hasWorkout = workoutDateKeys.has(dateKey);

            return (
              <button
                key={dateKey}
                onClick={() => setChosenDate(dateKey)}
                className={`h-10 rounded-xl relative flex flex-col items-center justify-center text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-white text-black font-extrabold shadow-sm'
                    : isToday
                    ? 'bg-zinc-900 border border-zinc-600 text-white'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <span>{day}</span>

                {/* Subtle Workout Indicator Dot */}
                {hasWorkout && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                      isSelected ? 'bg-black' : 'bg-white'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Date Summary & Legend */}
        <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-[11px]">
          <span className="text-zinc-400">
            Selected:{' '}
            <strong className="text-white font-semibold">
              {formatLocalDateLabel(chosenDate)}
            </strong>
          </span>

          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>Workout logged</span>
          </div>
        </div>

        {/* Quick Shortcuts & Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleJumpToToday}
              className="py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition border border-zinc-800"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Today</span>
            </button>

            <button
              onClick={handleClearFilter}
              className="py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition border border-zinc-800"
            >
              <X className="h-3 w-3" />
              <span>Clear Filter</span>
            </button>
          </div>

          <button
            onClick={handleApply}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-[0_0_15px_rgba(255,255,255,0.15)] cursor-pointer"
          >
            <Check className="h-4 w-4 stroke-[3]" />
            <span>Show Workouts for this Date</span>
          </button>
        </div>
      </div>
    </div>
  );
}
