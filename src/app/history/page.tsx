'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Trash2,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  HardDrive,
  Flame,
  Plus
} from 'lucide-react';
import { Workout, WorkoutExercise } from '@/types';
import { getWorkoutHistory, deleteWorkoutFromHistory, saveActiveWorkout } from '@/lib/storage';
import { BottomNav } from '@/components/layout/BottomNav';
import { formatDate, formatDuration } from '@/lib/utils/cn';

export default function HistoryPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getWorkoutHistory();
      setWorkouts(res.workouts || []);
      setDataSource(res.source);
      if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to load workout history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (workoutId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(workoutId);
    try {
      await deleteWorkoutFromHistory(workoutId);
      setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
    } catch (err: any) {
      alert(`Failed to delete workout: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRepeat = (workout: Workout) => {
    const clonedExercises: WorkoutExercise[] = workout.exercises.map((ex) => ({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ex_${Date.now()}_${Math.random()}`,
      exerciseName: ex.exerciseName,
      sets: ex.sets.map((s, idx) => ({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}_${idx}`,
        setNumber: idx + 1,
        weight: s.weight,
        reps: s.reps,
        unit: s.unit || 'kg',
        isCompleted: false,
      })),
    }));

    const newWorkout: Workout = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `w_${Date.now()}`,
      title: workout.title,
      startedAt: new Date().toISOString(),
      exercises: clonedExercises,
    };

    saveActiveWorkout(newWorkout);
    router.push('/');
  };

  // Helper to calculate duration in minutes
  const getDurationText = (w: Workout) => {
    if (!w.completedAt) return 'In progress';
    const start = new Date(w.startedAt).getTime();
    const end = new Date(w.completedAt).getTime();
    const diffSec = Math.max(0, Math.floor((end - start) / 1000));
    return formatDuration(diffSec);
  };

  // Helper to calculate total volume
  const getWorkoutVolume = (w: Workout) => {
    return w.exercises.reduce((acc, ex) => {
      return (
        acc +
        ex.sets.reduce((sAcc, s) => {
          return sAcc + s.weight * s.reps;
        }, 0)
      );
    }, 0);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-lime-400 block mb-0.5">
            TRAINING ARCHIVE
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Workout History</h1>
        </div>

        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition active:scale-95 disabled:opacity-50"
          title="Refresh history"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-lime-400' : ''}`} />
        </button>
      </div>

      {/* Source & Sync indicator banner */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          {dataSource === 'supabase' ? (
            <div className="flex items-center gap-1.5 text-lime-400 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>Synced with Supabase PostgreSQL</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <HardDrive className="h-4 w-4" />
              <span>Loaded from Local Storage (Offline / Guest)</span>
            </div>
          )}
        </div>
        <span className="text-zinc-500 font-mono text-[11px]">
          {workouts.length} {workouts.length === 1 ? 'session' : 'sessions'}
        </span>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-200">Supabase Query Notice</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 animate-pulse space-y-3"
            >
              <div className="h-4 bg-zinc-800 rounded-md w-1/2" />
              <div className="h-3 bg-zinc-800 rounded-md w-1/3" />
              <div className="h-8 bg-zinc-800 rounded-xl w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && workouts.length === 0 && (
        <div className="py-16 text-center rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 p-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-lime-400 mx-auto flex items-center justify-center border border-zinc-800 shadow-lg">
            <Dumbbell className="h-7 w-7 text-lime-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">No Workouts Logged Yet</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Finish a workout session on the main page to see your history and tracked volume here.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(163,230,53,0.3)] transition"
          >
            <Plus className="h-4 w-4" /> Start First Workout
          </button>
        </div>
      )}

      {/* Workout List */}
      {!isLoading && workouts.length > 0 && (
        <div className="space-y-3">
          {workouts.map((workout) => {
            const isExpanded = expandedWorkoutId === workout.id;
            const volume = getWorkoutVolume(workout);
            const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

            return (
              <div
                key={workout.id}
                className="rounded-3xl bg-zinc-900/90 border border-zinc-800 overflow-hidden shadow-lg transition"
              >
                {/* Workout Card Header */}
                <div
                  onClick={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
                  className="p-4 cursor-pointer hover:bg-zinc-850 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-lime-400 block mb-0.5">
                        {formatDate(workout.startedAt)}
                      </span>
                      <h2 className="text-base font-extrabold text-white">{workout.title}</h2>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(workout.id, workout.title);
                        }}
                        disabled={deletingId === workout.id}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition"
                        title="Delete workout"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 rounded-lg text-zinc-400">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-lime-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary Metrics Pill Bar */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-zinc-300">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-lime-400" />
                      {getDurationText(workout)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-lime-400" />
                      {volume.toLocaleString()} kg
                    </span>
                    <span>•</span>
                    <span>{workout.exercises.length} exercises</span>
                    <span>•</span>
                    <span>{totalSets} sets</span>
                  </div>

                  {/* Notes if provided */}
                  {workout.notes && (
                    <p className="text-xs text-zinc-400 italic mt-2 bg-zinc-950/60 p-2 rounded-xl border border-zinc-850">
                      “{workout.notes}”
                    </p>
                  )}
                </div>

                {/* Collapsible Details: Sets Breakdown */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 bg-zinc-950/80 p-4 space-y-3 animate-in fade-in">
                    <div className="space-y-3">
                      {workout.exercises.map((exercise, idx) => (
                        <div
                          key={exercise.id || idx}
                          className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">
                              {exercise.exerciseName}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {exercise.sets.length} {exercise.sets.length === 1 ? 'set' : 'sets'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {exercise.sets.map((s, sIdx) => (
                              <div
                                key={s.id || sIdx}
                                className="px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-850 text-center"
                              >
                                <span className="text-[10px] text-zinc-400 block">
                                  Set {s.setNumber || sIdx + 1}
                                </span>
                                <span className="font-extrabold text-xs text-lime-400">
                                  {s.weight} {s.unit || 'kg'}{' '}
                                  <span className="text-zinc-300 font-normal">× {s.reps}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action: Repeat Workout */}
                    <div className="pt-2">
                      <button
                        onClick={() => handleRepeat(workout)}
                        className="w-full py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(163,230,53,0.25)] transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Repeat This Workout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
