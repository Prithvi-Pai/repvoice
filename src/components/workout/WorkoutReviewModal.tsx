'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Flame,
  Clock,
  Dumbbell,
  Mic,
  ListOrdered,
  Sparkles,
  Check,
  ShieldCheck,
  AlertCircle,
  X,
  Pencil,
  Calendar,
} from 'lucide-react';
import { Workout, WeightUnit, PersonalRecord, WorkoutReviewMetrics } from '@/types';
import {
  calculateWorkoutReviewMetrics,
  calculateEstimatedCalories,
} from '@/lib/analytics/metricsEngine';
import {
  getPersonalRecords,
  evaluateWorkoutPRs,
} from '@/lib/records/personalRecordEngine';
import { formatDuration } from '@/lib/utils/cn';
import { generateDefaultWorkoutName, isGenericWorkoutTitle } from '@/lib/history/dateGrouping';

interface WorkoutReviewModalProps {
  isOpen: boolean;
  workout: Workout;
  elapsedSeconds: number;
  preferredUnit: WeightUnit;
  userEmail: string | null;
  isSaving: boolean;
  workoutNotes: string;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
  onSave: (finalTitle: string) => Promise<void> | void;
}

export function WorkoutReviewModal({
  isOpen,
  workout,
  elapsedSeconds,
  preferredUnit,
  userEmail,
  isSaving,
  workoutNotes,
  onNotesChange,
  onClose,
  onSave,
}: WorkoutReviewModalProps) {
  const [existingPRs, setExistingPRs] = useState<PersonalRecord[]>([]);
  const [detectedPRs, setDetectedPRs] = useState<PersonalRecord[]>([]);
  const [metrics, setMetrics] = useState<WorkoutReviewMetrics | null>(null);
  const [estimatedCalories, setEstimatedCalories] = useState<number>(0);

  // Automatic default workout title (cleans generic 'Voice Workout', 'Gym Workout', etc.)
  const getInitialTitle = (w?: Workout | null) => {
    if (!w) return generateDefaultWorkoutName(new Date());
    if (isGenericWorkoutTitle(w.title)) {
      return generateDefaultWorkoutName(w.completedAt || w.startedAt || new Date());
    }
    return w.title;
  };

  const [workoutTitle, setWorkoutTitle] = useState<string>(() => getInitialTitle(workout));
  const hasInitializedForOpenRef = useRef<boolean>(false);

  // Initialize title ONLY once when modal transitions to open
  useEffect(() => {
    if (isOpen) {
      if (!hasInitializedForOpenRef.current) {
        setWorkoutTitle(getInitialTitle(workout));
        hasInitializedForOpenRef.current = true;
      }
    } else {
      hasInitializedForOpenRef.current = false;
    }
  }, [isOpen, workout]);

  // Evaluate PRs and metrics once per modal open
  useEffect(() => {
    if (isOpen && workout) {
      getPersonalRecords().then((prs) => {
        setExistingPRs(prs);
        const newPrList = evaluateWorkoutPRs(workout, prs);
        setDetectedPRs(newPrList);
        const reviewMetrics = calculateWorkoutReviewMetrics(workout, newPrList);
        setMetrics(reviewMetrics);
      });
    }
  }, [isOpen, workout]);

  // Update calories burned as duration increases, without re-evaluating PRs or resetting the title
  useEffect(() => {
    if (isOpen && metrics) {
      const calories = calculateEstimatedCalories(
        elapsedSeconds,
        metrics.totalVolume,
        metrics.totalSets
      );
      setEstimatedCalories(calories);
    }
  }, [isOpen, elapsedSeconds, metrics]);

  if (!isOpen || !workout) return null;

  const totalExercises = workout.exercises.length;
  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = workout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.isCompleted).length,
    0
  );
  const totalVolume = workout.exercises.reduce(
    (acc, ex) =>
      acc +
      ex.sets.reduce((sAcc, s) => sAcc + (s.isCompleted ? (s.weight || 0) * (s.reps || 0) : 0), 0),
    0
  );

  const voiceSets = workout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.isCompleted && s.isVoiceLogged !== false).length,
    0
  );
  const voicePercent = completedSets > 0 ? Math.round((voiceSets / completedSets) * 100) : 100;

  const completionDateString = new Date(workout.completedAt || workout.startedAt || Date.now()).toLocaleDateString(
    'en-US',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );

  const finalSaveTitle = workoutTitle.trim() || generateDefaultWorkoutName(workout.completedAt || new Date());

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in font-sans">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-750 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block leading-none">
                WORKOUT SUMMARY
              </span>
              <h2 className="text-sm font-extrabold text-white tracking-tight truncate max-w-[220px] sm:max-w-xs mt-0.5">
                {finalSaveTitle}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center transition border border-zinc-800 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1 space-y-4 py-4 pr-1">
          {/* Prominent Directly Editable Workout Name Card */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-750 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5 text-white" />
                Workout Name (Tap to Edit)
              </label>
              <button
                type="button"
                onClick={() =>
                  setWorkoutTitle(generateDefaultWorkoutName(workout.completedAt || workout.startedAt || new Date()))
                }
                className="text-[10px] text-zinc-400 hover:text-white font-mono underline cursor-pointer"
                title="Reset to default date-based name"
              >
                Auto-Name
              </button>
            </div>

            <input
              type="text"
              value={workoutTitle}
              onChange={(e) => setWorkoutTitle(e.target.value)}
              placeholder="e.g. Workout – Sunday, 15 November 2026"
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-white rounded-xl px-3.5 py-2.5 text-sm text-white font-bold tracking-tight outline-none transition"
            />
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-zinc-400" />
              Recorded on {completionDateString}
            </span>
          </div>

          {/* PR Banner if Any PRs Established */}
          {detectedPRs.length > 0 && (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-750 p-3.5 relative overflow-hidden">
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  <Trophy className="w-5 h-5 fill-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-white block">
                    {detectedPRs.length} New Personal Record{detectedPRs.length > 1 ? 's' : ''}!
                  </span>
                  <div className="mt-1 space-y-1">
                    {detectedPRs.map((pr, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs bg-black/40 px-2.5 py-1 rounded-lg border border-white/5"
                      >
                        <span className="text-zinc-200 font-semibold truncate pr-2">
                          {pr.exerciseName}
                        </span>
                        <span className="text-white font-mono font-bold whitespace-nowrap">
                          {pr.recordValue} {pr.unit}
                          {pr.delta ? (
                            <span className="text-zinc-400 text-[10px] font-normal ml-1">
                              (+{pr.delta} {pr.unit})
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4-Card Bento Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Card 1: Duration */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">Duration</span>
                <Clock className="w-4 h-4 text-zinc-300" />
              </div>
              <div>
                <span className="text-xl font-black text-white font-mono block">
                  {formatDuration(elapsedSeconds)}
                </span>
                <span className="text-[10px] text-zinc-400">Total active session</span>
              </div>
            </div>

            {/* Card 2: Total Volume */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">Volume</span>
                <Dumbbell className="w-4 h-4 text-zinc-300" />
              </div>
              <div>
                <span className="text-xl font-black text-white font-mono block">
                  {Math.round(totalVolume).toLocaleString()}{' '}
                  <span className="text-xs font-normal text-zinc-400 font-sans">{preferredUnit}</span>
                </span>
                <span className="text-[10px] text-zinc-400">
                  {totalExercises} movement{totalExercises !== 1 ? 's' : ''} logged
                </span>
              </div>
            </div>

            {/* Card 3: Sets & Calories */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Sets</span>
                <ListOrdered className="w-4 h-4 text-zinc-300" />
              </div>
              <div>
                <span className="text-xl font-black text-white font-mono block">
                  {completedSets}{' '}
                  <span className="text-xs font-normal text-zinc-400 font-sans">/ {totalSets}</span>
                </span>
                <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                  <Flame className="w-3 h-3 text-rose-400" />
                  ~{estimatedCalories} kcal burned
                </span>
              </div>
            </div>

            {/* Card 4: Voice Sync Fidelity */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">Voice Sync</span>
                <Mic className="w-4 h-4 text-zinc-300" />
              </div>
              <div>
                <span className="text-xl font-black text-white font-mono block">
                  {voicePercent}%
                </span>
                <span className="text-[10px] text-zinc-400">
                  {voiceSets} / {completedSets || 1} logged hands-free
                </span>
              </div>
            </div>
          </div>

          {/* Cloud Sync vs Guest Status */}
          {userEmail ? (
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-2.5 text-xs text-zinc-300">
              <ShieldCheck className="h-4 w-4 text-white shrink-0" />
              <div className="flex-1 truncate">
                <span className="font-bold text-white block">Syncing to Supabase Cloud</span>
                <p className="text-zinc-400 text-[11px] truncate">{userEmail}</p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-zinc-300 font-bold">
                <AlertCircle className="h-4 w-4 text-zinc-400 shrink-0" />
                <span>Guest Mode (Local Storage Only)</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Sign in to save this session to your Supabase cloud database.
              </p>
            </div>
          )}

          {/* Workout Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Workout Notes (optional)
            </label>
            <textarea
              value={workoutNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Felt strong, good pump, increased bench weight..."
              rows={2}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-800 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition cursor-pointer border border-zinc-800"
          >
            Keep Going
          </button>
          <button
            onClick={() => onSave(finalSaveTitle)}
            disabled={isSaving}
            className="flex-2 w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_2px_15px_rgba(255,255,255,0.2)] transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Saving Workout...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save & Finish Session</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
