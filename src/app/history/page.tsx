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
  Plus,
  Filter,
  X,
  Pencil,
  Check,
  Play,
} from 'lucide-react';
import { Workout, WorkoutExercise } from '@/types';
import {
  getWorkoutHistory,
  deleteWorkoutFromHistory,
  updateWorkoutTitle,
  updateWorkoutInHistory,
  saveActiveWorkout,
  getActiveWorkout,
  resumeWorkoutFromHistory,
} from '@/lib/storage';
import { toTitleCase, saveLearnedAlias } from '@/lib/exercises/exerciseStore';
import { getWorkoutMuscleGroupsSummary } from '@/lib/exercises/muscleGroupStore';
import { BottomNav } from '@/components/layout/BottomNav';
import { formatDate, formatDuration } from '@/lib/utils/cn';
import {
  groupWorkoutsByDate,
  filterWorkoutsBySpecificDate,
  formatLocalDateLabel,
  getLocalDateKey,
  getTodayAndYesterdayKeys,
} from '@/lib/history/dateGrouping';
import { HistoryCalendarModal } from '@/components/history/HistoryCalendarModal';
import { calculateMonthlyRollup } from '@/lib/analytics/metricsEngine';

export default function HistoryPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [isSavingTitle, setIsSavingTitle] = useState<boolean>(false);

  const handleStartEditTitle = (e: React.MouseEvent, workout: Workout) => {
    e.stopPropagation();
    setEditingWorkoutId(workout.id);
    setEditingTitle(workout.title);
  };

  const handleSaveTitle = async (e: React.MouseEvent, workoutId: string) => {
    e.stopPropagation();
    const clean = editingTitle.trim();
    if (!clean) return;

    setIsSavingTitle(true);
    try {
      await updateWorkoutTitle(workoutId, clean);
      setWorkouts((prev) =>
        prev.map((w) => (w.id === workoutId ? { ...w, title: clean } : w))
      );
      setEditingWorkoutId(null);
    } catch (err: any) {
      alert(`Failed to save workout title: ${err?.message || err}`);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCancelEditTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWorkoutId(null);
    setEditingTitle('');
  };

  // Muscle group editing state for historical workouts
  const [editingMuscleWorkoutId, setEditingMuscleWorkoutId] = useState<string | null>(null);
  const [editingMuscleText, setEditingMuscleText] = useState<string>('');

  const handleSaveMuscleGroup = async (e: React.MouseEvent, workoutId: string) => {
    e.stopPropagation();
    const clean = editingMuscleText.trim();
    const targetWorkout = workouts.find((w) => w.id === workoutId);
    if (!targetWorkout) return;

    const updatedWorkout: Workout = {
      ...targetWorkout,
      muscleGroupDescription: clean || undefined,
    };

    setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
    setEditingMuscleWorkoutId(null);

    await updateWorkoutInHistory(updatedWorkout);
  };

  // Exercise and Set editing state for historical workouts
  const [editingExerciseKey, setEditingExerciseKey] = useState<string | null>(null);
  const [editingExerciseName, setEditingExerciseName] = useState<string>('');
  const [addingExerciseWorkoutId, setAddingExerciseWorkoutId] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState<string>('');
  const [editingSetKey, setEditingSetKey] = useState<string | null>(null);
  const [editingSetWeight, setEditingSetWeight] = useState<string>('');
  const [editingSetReps, setEditingSetReps] = useState<string>('');

  // 1. Rename Exercise in Past Workout
  const handleSaveExerciseName = async (workoutId: string, exIndex: number) => {
    const clean = toTitleCase(editingExerciseName.trim());
    if (!clean) return;

    const targetWorkout = workouts.find((w) => w.id === workoutId);
    if (!targetWorkout || !targetWorkout.exercises[exIndex]) return;

    const oldName = targetWorkout.exercises[exIndex].exerciseName;
    const updatedExercises = targetWorkout.exercises.map((ex, idx) =>
      idx === exIndex ? { ...ex, exerciseName: clean } : ex
    );

    const updatedWorkout: Workout = {
      ...targetWorkout,
      exercises: updatedExercises,
    };

    setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
    setEditingExerciseKey(null);

    await updateWorkoutInHistory(updatedWorkout);

    // If renamed, also reinforce learned alias so future voice recognitions immediately map
    if (oldName.toLowerCase() !== clean.toLowerCase()) {
      saveLearnedAlias(oldName, clean).catch((err) =>
        console.info('Learned alias from history rename:', err)
      );
    }
  };

  // 2. Delete Exercise from Past Workout
  const handleDeleteExerciseInHistory = async (
    workoutId: string,
    exIndex: number,
    exerciseName: string
  ) => {
    if (!confirm(`Delete "${exerciseName}" and its sets from this workout?`)) return;

    const targetWorkout = workouts.find((w) => w.id === workoutId);
    if (!targetWorkout) return;

    const updatedExercises = targetWorkout.exercises.filter((_, idx) => idx !== exIndex);
    const updatedWorkout: Workout = {
      ...targetWorkout,
      exercises: updatedExercises,
    };

    setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
    await updateWorkoutInHistory(updatedWorkout);
  };

  // 3. Add New Exercise to Past Workout
  const handleSaveNewExercise = async (workoutId: string) => {
    const clean = toTitleCase(newExerciseName.trim());
    if (!clean) return;

    const targetWorkout = workouts.find((w) => w.id === workoutId);
    if (!targetWorkout) return;

    const newExId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ex_${Date.now()}_${Math.random()}`;
    const newSetId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `set_${Date.now()}_0`;

    const newExercise: WorkoutExercise = {
      id: newExId,
      exerciseName: clean,
      sets: [
        {
          id: newSetId,
          setNumber: 1,
          weight: 0,
          reps: 10,
          unit: 'kg',
          isCompleted: true,
        },
      ],
    };

    const updatedWorkout: Workout = {
      ...targetWorkout,
      exercises: [...targetWorkout.exercises, newExercise],
    };

    setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
    setAddingExerciseWorkoutId(null);
    setNewExerciseName('');

    await updateWorkoutInHistory(updatedWorkout);
  };

  // 4. Add Set to Exercise in Past Workout
  const handleAddSetToHistory = async (workoutId: string, exIndex: number) => {
    const targetWorkout = workouts.find((w) => w.id === workoutId);
    if (!targetWorkout || !targetWorkout.exercises[exIndex]) return;

    const targetEx = targetWorkout.exercises[exIndex];
    const lastSet = targetEx.sets[targetEx.sets.length - 1];
    const newSetId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `set_${Date.now()}_${targetEx.sets.length}`;

    const newSet = {
      id: newSetId,
      setNumber: targetEx.sets.length + 1,
      weight: lastSet ? lastSet.weight : 0,
      reps: lastSet ? lastSet.reps : 10,
      unit: lastSet ? lastSet.unit : 'kg',
      isCompleted: true,
    };

    const updatedExercises = targetWorkout.exercises.map((ex, idx) =>
      idx === exIndex ? { ...ex, sets: [...ex.sets, newSet] } : ex
    );

    const updatedWorkout: Workout = {
      ...targetWorkout,
      exercises: updatedExercises,
    };

    setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
    await updateWorkoutInHistory(updatedWorkout);
  };

  // 5. Save edited set in Past Workout
  const handleSaveSet = async (workoutId: string, exIndex: number, setIndex: number) => {
    const targetWorkout = workouts.find((w) => w.id === workoutId);
    if (!targetWorkout || !targetWorkout.exercises[exIndex]) return;

    const parsedWeight = parseFloat(editingSetWeight);
    const parsedReps = parseInt(editingSetReps, 10);

    const safeWeight = isNaN(parsedWeight) ? 0 : Math.max(0, parsedWeight);
    const safeReps = isNaN(parsedReps) ? 0 : Math.max(0, parsedReps);

    const updatedExercises = targetWorkout.exercises.map((ex, eIdx) => {
      if (eIdx !== exIndex) return ex;
      const updatedSets = ex.sets.map((s, sIdx) => {
        if (sIdx !== setIndex) return s;
        return {
          ...s,
          weight: safeWeight,
          reps: safeReps,
        };
      });
      return { ...ex, sets: updatedSets };
    });

    const updatedWorkout: Workout = {
      ...targetWorkout,
      exercises: updatedExercises,
    };

    setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
    setEditingSetKey(null);

    await updateWorkoutInHistory(updatedWorkout);
  };

  // 6. Delete set from past workout
  const handleDeleteSetInHistory = async (
    workoutId: string,
    exIndex: number,
    setIndex: number
  ) => {
    const targetWorkout = workouts.find((w) => w.id === workoutId);
    if (!targetWorkout || !targetWorkout.exercises[exIndex]) return;

    const targetEx = targetWorkout.exercises[exIndex];

    if (targetEx.sets.length <= 1) {
      if (
        confirm(
          `This is the only set for "${targetEx.exerciseName}". Delete the entire exercise?`
        )
      ) {
        handleDeleteExerciseInHistory(workoutId, exIndex, targetEx.exerciseName);
      }
      return;
    }

    const updatedSets = targetEx.sets
      .filter((_, sIdx) => sIdx !== setIndex)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));

    const updatedExercises = targetWorkout.exercises.map((ex, eIdx) =>
      eIdx === exIndex ? { ...ex, sets: updatedSets } : ex
    );

    const updatedWorkout: Workout = {
      ...targetWorkout,
      exercises: updatedExercises,
    };

    setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
    setEditingSetKey(null);

    await updateWorkoutInHistory(updatedWorkout);
  };

  const rollup = calculateMonthlyRollup(workouts);

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

  // Resume an existing completed/auto-saved workout from today
  const handleResumeWorkout = async (workout: Workout) => {
    const active = getActiveWorkout();
    if (active && active.id !== workout.id && active.exercises.some((e) => e.sets.length > 0)) {
      if (
        !confirm(
          `You already have an active workout in progress ("${active.title}"). Switch and resume "${workout.title}" from earlier today?`
        )
      ) {
        return;
      }
    }

    try {
      const resumed = await resumeWorkoutFromHistory(workout.id);
      if (resumed) {
        setWorkouts((prev) => prev.filter((w) => w.id !== workout.id));
        router.push('/');
      } else {
        const priorDuration = workout.durationSeconds || 0;
        const adjustedStartedAt = new Date(Date.now() - priorDuration * 1000).toISOString();
        const fallbackResumed: Workout = {
          ...workout,
          startedAt: adjustedStartedAt,
          completedAt: undefined,
          lastEntryAt: new Date().toISOString(),
          isResumed: true,
        };
        saveActiveWorkout(fallbackResumed);
        await deleteWorkoutFromHistory(workout.id);
        setWorkouts((prev) => prev.filter((w) => w.id !== workout.id));
        router.push('/');
      }
    } catch (err: any) {
      alert(`Failed to resume workout: ${err?.message || err}`);
    }
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

  const renderWorkoutCard = (workout: Workout) => {
    const isExpanded = expandedWorkoutId === workout.id;
    const volume = getWorkoutVolume(workout);
    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const { todayKey } = getTodayAndYesterdayKeys();
    const isToday = getLocalDateKey(workout.startedAt || workout.completedAt || new Date()) === todayKey;

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
            {editingWorkoutId === workout.id ? (
              <div className="flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Edit Workout Title
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle(e as any, workout.id);
                      if (e.key === 'Escape') handleCancelEditTitle(e as any);
                    }}
                    autoFocus
                    className="flex-1 bg-zinc-950 border border-zinc-700 focus:border-white rounded-xl px-3 py-1.5 text-sm text-white font-bold outline-none"
                  />
                  <button
                    onClick={(e) => handleSaveTitle(e, workout.id)}
                    disabled={isSavingTitle || !editingTitle.trim()}
                    className="p-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold transition disabled:opacity-50 cursor-pointer"
                    title="Save Title"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                  </button>
                  <button
                    onClick={handleCancelEditTitle}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0 pr-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
                  {formatDate(workout.startedAt)}
                </span>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-white truncate">{workout.title}</h2>
                  <button
                    onClick={(e) => handleStartEditTitle(e, workout)}
                    className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition shrink-0 cursor-pointer"
                    title="Edit workout name"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Muscle Group Trained (italics, small readable font, editable) */}
                <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                  {editingMuscleWorkoutId === workout.id ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={editingMuscleText}
                        onChange={(e) => setEditingMuscleText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveMuscleGroup(e as any, workout.id);
                          if (e.key === 'Escape') setEditingMuscleWorkoutId(null);
                        }}
                        autoFocus
                        placeholder="e.g. Chest & Triceps"
                        className="bg-zinc-950 border border-zinc-700 focus:border-white rounded-lg px-2 py-0.5 text-xs text-white italic outline-none w-48"
                      />
                      <button
                        onClick={(e) => handleSaveMuscleGroup(e, workout.id)}
                        className="p-1 rounded-md bg-white text-black hover:bg-zinc-200 transition cursor-pointer"
                        title="Save Muscle Group"
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMuscleWorkoutId(null);
                        }}
                        className="p-1 rounded-md bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                        title="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 group/mg">
                      <span className="text-xs italic text-zinc-400 font-medium">
                        {workout.muscleGroupDescription || getWorkoutMuscleGroupsSummary(workout)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMuscleWorkoutId(workout.id);
                          setEditingMuscleText(
                            workout.muscleGroupDescription || getWorkoutMuscleGroupsSummary(workout)
                          );
                        }}
                        className="opacity-60 sm:opacity-0 group-hover/mg:opacity-100 p-0.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition cursor-pointer"
                        title="Edit muscle groups trained"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              {isToday && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResumeWorkout(workout);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white text-black hover:bg-zinc-200 text-[11px] font-black flex items-center gap-1 shadow-sm transition cursor-pointer shrink-0"
                  title="Resume this session from earlier today"
                >
                  <Play className="h-3 w-3 fill-black" />
                  <span>Resume</span>
                </button>
              )}
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
                  <ChevronUp className="h-4 w-4 text-zinc-300" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Summary Metrics Pill Bar */}
          <div className="flex items-center gap-3 mt-3 text-xs text-zinc-300">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              {getDurationText(workout)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-zinc-400" />
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
              {workout.exercises.map((exercise, idx) => {
                const isEditingEx = editingExerciseKey === `${workout.id}_${idx}`;
                return (
                  <div
                    key={exercise.id || idx}
                    className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-2.5"
                  >
                    {/* Exercise Header with Inline Edit and Delete */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                      {isEditingEx ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingExerciseName}
                            onChange={(e) => setEditingExerciseName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveExerciseName(workout.id, idx);
                              if (e.key === 'Escape') setEditingExerciseKey(null);
                            }}
                            autoFocus
                            className="flex-1 bg-zinc-950 border border-zinc-700 focus:border-white rounded-lg px-2 py-1 text-xs text-white font-bold outline-none"
                          />
                          <button
                            onClick={() => handleSaveExerciseName(workout.id, idx)}
                            className="p-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 transition cursor-pointer"
                            title="Save Exercise Name"
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </button>
                          <button
                            onClick={() => setEditingExerciseKey(null)}
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                            title="Cancel"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-white">
                            {exercise.exerciseName}
                          </span>
                          <button
                            onClick={() => {
                              setEditingExerciseKey(`${workout.id}_${idx}`);
                              setEditingExerciseName(exercise.exerciseName);
                            }}
                            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                            title="Edit exercise name"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {exercise.sets.length} {exercise.sets.length === 1 ? 'set' : 'sets'}
                        </span>
                        <button
                          onClick={() => handleDeleteExerciseInHistory(workout.id, idx, exercise.exerciseName)}
                          className="p-1 rounded-md text-zinc-600 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
                          title="Delete exercise"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sets Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {exercise.sets.map((s, sIdx) => {
                        const isEditingSet = editingSetKey === `${workout.id}_${idx}_${sIdx}`;
                        if (isEditingSet) {
                          return (
                            <div
                              key={s.id || sIdx}
                              className="col-span-2 sm:col-span-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-700 space-y-2 shadow-md animate-in fade-in"
                            >
                              <div className="flex items-center justify-between text-[11px] text-zinc-300 font-bold">
                                <span>Editing Set {s.setNumber || sIdx + 1}</span>
                                <button
                                  onClick={() => handleDeleteSetInHistory(workout.id, idx, sIdx)}
                                  className="text-zinc-500 hover:text-rose-400 transition text-[10px] flex items-center gap-1 cursor-pointer"
                                  title="Delete this set"
                                >
                                  <Trash2 className="h-3 w-3" /> Delete Set
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-0.5">
                                    Weight ({s.unit || 'kg'})
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={editingSetWeight}
                                    onChange={(e) => setEditingSetWeight(e.target.value)}
                                    autoFocus
                                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-white rounded-lg px-2.5 py-1 text-xs text-white font-bold outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-0.5">
                                    Reps
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={editingSetReps}
                                    onChange={(e) => setEditingSetReps(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-white rounded-lg px-2.5 py-1 text-xs text-white font-bold outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-1.5 pt-1">
                                <button
                                  onClick={() => handleSaveSet(workout.id, idx, sIdx)}
                                  className="px-3 py-1 rounded-lg bg-white text-black font-extrabold text-xs hover:bg-zinc-200 transition cursor-pointer"
                                >
                                  Save Set
                                </button>
                                <button
                                  onClick={() => setEditingSetKey(null)}
                                  className="px-3 py-1 rounded-lg bg-zinc-850 text-zinc-400 font-bold text-xs hover:text-white transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={s.id || sIdx}
                            onClick={() => {
                              setEditingSetKey(`${workout.id}_${idx}_${sIdx}`);
                              setEditingSetWeight(String(s.weight));
                              setEditingSetReps(String(s.reps));
                            }}
                            className="px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-850 hover:border-zinc-700 transition cursor-pointer text-center group relative"
                            title="Tap to edit weight / reps"
                          >
                            <div className="flex items-center justify-between text-[10px] text-zinc-400">
                              <span>Set {s.setNumber || sIdx + 1}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSetInHistory(workout.id, idx, sIdx);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                                title="Delete set"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-extrabold text-xs text-white">
                                {s.weight} {s.unit || 'kg'}{' '}
                                <span className="text-zinc-400 font-normal">× {s.reps}</span>
                              </span>
                              <Pencil className="h-2.5 w-2.5 text-zinc-600 group-hover:text-zinc-300 transition" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Set button */}
                    <button
                      onClick={() => handleAddSetToHistory(workout.id, idx)}
                      className="w-full py-1.5 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-400 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add Set
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add Exercise to this Past Workout */}
            {addingExerciseWorkoutId === workout.id ? (
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 space-y-2.5 shadow-lg animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                    Add Exercise to Workout
                  </span>
                  <button
                    onClick={() => {
                      setAddingExerciseWorkoutId(null);
                      setNewExerciseName('');
                    }}
                    className="text-zinc-500 hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. Incline Dumbbell Press"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNewExercise(workout.id);
                      if (e.key === 'Escape') {
                        setAddingExerciseWorkoutId(null);
                        setNewExerciseName('');
                      }
                    }}
                    autoFocus
                    className="flex-1 bg-zinc-950 border border-zinc-700 focus:border-white rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-medium outline-none"
                  />
                  <button
                    onClick={() => handleSaveNewExercise(workout.id)}
                    disabled={!newExerciseName.trim()}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs transition disabled:opacity-40 cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {['Bench Press', 'Squat', 'Deadlift', 'Shoulder Press', 'Lat Pulldown', 'Bicep Curl', 'Tricep Pushdown'].map(
                    (chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setNewExerciseName(chip)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                      >
                        {chip}
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAddingExerciseWorkoutId(workout.id);
                  setNewExerciseName('');
                }}
                className="w-full py-2.5 rounded-xl border border-dashed border-zinc-750 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add New Exercise
              </button>
            )}

            {/* Actions: Resume Workout (Only for Today) & Repeat Workout */}
            <div className="pt-2 space-y-2">
              {isToday && (
                <button
                  onClick={() => handleResumeWorkout(workout)}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_2px_15px_rgba(255,255,255,0.15)] transition cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-black" />
                  Resume Today's Workout Session
                </button>
              )}
              <button
                onClick={() => handleRepeat(workout)}
                className={`w-full ${
                  isToday
                    ? 'py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white font-bold'
                    : 'py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold shadow-md'
                } text-xs flex items-center justify-center gap-1.5 transition cursor-pointer`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {isToday ? 'Repeat As New Workout' : 'Repeat This Workout'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-0.5">
            TRAINING ARCHIVE
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Workout History</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCalendarModal(true)}
            className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
              selectedDateKey
                ? 'bg-white text-black border-white font-extrabold shadow-sm'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-750'
            }`}
            title="Filter by calendar date"
          >
            <Calendar className="h-4 w-4" />
            {selectedDateKey && <span className="text-[11px] font-mono">{selectedDateKey}</span>}
          </button>

          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-zinc-300 hover:text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh history"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-white' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stitch Monthly Rollup Snapshot */}
      {workouts.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md">
          <div className="text-center p-2 rounded-xl bg-zinc-900 border border-zinc-850">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Workouts
            </span>
            <span className="text-base font-extrabold text-white font-mono">
              {rollup.totalWorkouts}
            </span>
          </div>
          <div className="text-center p-2 rounded-xl bg-zinc-900 border border-zinc-850">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Volume
            </span>
            <span className="text-base font-extrabold text-white font-mono">
              {rollup.totalVolume >= 1000 ? `${(rollup.totalVolume / 1000).toFixed(1)}k` : rollup.totalVolume}
            </span>
          </div>
          <div className="text-center p-2 rounded-xl bg-zinc-900 border border-zinc-850">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Avg Time
            </span>
            <span className="text-base font-extrabold text-zinc-200 font-mono">
              {rollup.avgDurationMinutes}m
            </span>
          </div>
        </div>
      )}

      {/* Calendar Filter Indicator Bar if active */}
      {selectedDateKey && (
        <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-white" />
            <span className="text-zinc-200">
              Showing date: <strong className="text-white">{formatLocalDateLabel(selectedDateKey)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalendarModal(true)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition"
            >
              <Calendar className="h-3 w-3" />
              <span>Change</span>
            </button>
            <button
              onClick={() => setSelectedDateKey(null)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition"
            >
              <X className="h-3 w-3" />
              <span>Clear Filter</span>
            </button>
          </div>
        </div>
      )}

      {/* Source & Sync indicator banner */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          {dataSource === 'supabase' ? (
            <div className="flex items-center gap-1.5 text-white font-bold">
              <ShieldCheck className="h-4 w-4 text-white" />
              <span>Synced with Supabase PostgreSQL</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
              <HardDrive className="h-4 w-4 text-zinc-400" />
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

      {/* Empty State when no workouts exist at all */}
      {!isLoading && workouts.length === 0 && (
        <div className="py-16 text-center rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 p-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-zinc-300 mx-auto flex items-center justify-center border border-zinc-800 shadow-lg">
            <Dumbbell className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">No Workouts Logged Yet</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Finish a workout session on the main page to see your history and tracked volume here.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs inline-flex items-center gap-1.5 shadow-md transition"
          >
            <Plus className="h-4 w-4" /> Start First Workout
          </button>
        </div>
      )}

      {/* VIEW A: SPECIFIC CALENDAR DATE FILTER ACTIVE */}
      {!isLoading && workouts.length > 0 && selectedDateKey && (
        <div className="space-y-3">
          {(() => {
            const filtered = filterWorkoutsBySpecificDate(workouts, selectedDateKey);
            if (filtered.length === 0) {
              return (
                <div className="py-12 text-center rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 p-6 space-y-3">
                  <Calendar className="h-8 w-8 text-zinc-600 mx-auto" />
                  <h3 className="font-bold text-white text-sm">No workouts recorded on this date.</h3>
                  <p className="text-xs text-zinc-400">
                    You did not record any training sessions on {formatLocalDateLabel(selectedDateKey)}.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => setShowCalendarModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition border border-zinc-750"
                    >
                      Choose Another Date
                    </button>
                    <button
                      onClick={() => setSelectedDateKey(null)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-extrabold transition shadow-sm"
                    >
                      Clear Filter
                    </button>
                  </div>
                </div>
              );
            }
            return filtered.map((workout) => renderWorkoutCard(workout));
          })()}
        </div>
      )}

      {/* VIEW B: DEFAULT TODAY AND YESTERDAY VIEW */}
      {!isLoading && workouts.length > 0 && !selectedDateKey && (
        <div className="space-y-6">
          {(() => {
            const grouped = groupWorkoutsByDate(workouts);

            return (
              <>
                {/* Section: Today */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white inline-block animate-pulse" />
                      Today
                    </h2>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {grouped.today.length} {grouped.today.length === 1 ? 'workout' : 'workouts'}
                    </span>
                  </div>

                  {grouped.today.length > 0 ? (
                    <div className="space-y-3">
                      {grouped.today.map((w) => renderWorkoutCard(w))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-850 text-center text-xs text-zinc-400">
                      No workouts logged today.
                    </div>
                  )}
                </div>

                {/* Section: Yesterday */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                      Yesterday
                    </h2>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {grouped.yesterday.length} {grouped.yesterday.length === 1 ? 'workout' : 'workouts'}
                    </span>
                  </div>

                  {grouped.yesterday.length > 0 ? (
                    <div className="space-y-3">
                      {grouped.yesterday.map((w) => renderWorkoutCard(w))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-850 text-center text-xs text-zinc-400">
                      No workouts logged yesterday.
                    </div>
                  )}
                </div>

                {/* Section: Older Workouts Notice */}
                {grouped.older.length > 0 && (
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                    <span>
                      {grouped.older.length} earlier training session{grouped.older.length === 1 ? '' : 's'} recorded.
                    </span>
                    <button
                      onClick={() => setShowCalendarModal(true)}
                      className="font-bold text-white hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Explore Past Dates</span>
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Calendar Picker Modal */}
      {showCalendarModal && (
        <HistoryCalendarModal
          currentSelectedDateKey={selectedDateKey}
          workouts={workouts}
          onSelectDate={setSelectedDateKey}
          onClose={() => setShowCalendarModal(false)}
        />
      )}

      {/* Bottom Nav */}
      <BottomNav hasActiveWorkout={Boolean(getActiveWorkout())} />
    </div>
  );
}
