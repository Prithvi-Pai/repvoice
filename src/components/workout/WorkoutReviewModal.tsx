'use client';

import { useState, useEffect } from 'react';
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
import { generateDefaultWorkoutName } from '@/lib/history/dateGrouping';

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

  // Automatic default workout title
  const defaultInitialTitle =
    workout?.title && workout.title !== 'Gym Workout' && workout.title !== 'New Workout'
      ? workout.title
      : generateDefaultWorkoutName(workout?.completedAt || new Date());

  const [workoutTitle, setWorkoutTitle] = useState<string>(defaultInitialTitle);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [tempTitle, setTempTitle] = useState<string>(defaultInitialTitle);

  useEffect(() => {
    if (isOpen && workout) {
      const generated =
        workout.title && workout.title !== 'Gym Workout' && workout.title !== 'New Workout'
          ? workout.title
          : generateDefaultWorkoutName(workout.completedAt || new Date());
      setWorkoutTitle(generated);
      setTempTitle(generated);
      setIsEditingTitle(false);

      getPersonalRecords().then((prs) => {
        setExistingPRs(prs);
        const newPrList = evaluateWorkoutPRs(workout, prs);
        setDetectedPRs(newPrList);
        const reviewMetrics = calculateWorkoutReviewMetrics(workout, newPrList);
        setMetrics(reviewMetrics);

        const calories = calculateEstimatedCalories(
          elapsedSeconds,
          reviewMetrics.totalVolume,
          reviewMetrics.totalSets
        );
        setEstimatedCalories(calories);
      });
    }
  }, [isOpen, workout, elapsedSeconds]);

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

  const handleSaveTitleEdit = () => {
    if (tempTitle.trim()) {
      setWorkoutTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCancelTitleEdit = () => {
    setTempTitle(workoutTitle);
    setIsEditingTitle(false);
  };

  const completionDateString = new Date(workout.completedAt || workout.startedAt || Date.now()).toLocaleDateString(
    'en-US',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in font-sans">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-750 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block leading-none">
                WORKOUT SUMMARY
              </span>
              <span className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-zinc-400" />
                {completionDateString}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center transition border border-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1 space-y-4 py-4 pr-1">
          {/* Workout Title Section with Inline Edit */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                Session Title
              </span>
              {!isEditingTitle && (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-semibold transition"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit Name</span>
                </button>
              )}
            </div>

            {isEditingTitle ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitleEdit();
                    if (e.key === 'Escape') handleCancelTitleEdit();
                  }}
                  autoFocus
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-white"
                />
                <button
                  onClick={handleSaveTitleEdit}
                  className="p-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold transition"
                  title="Save Title"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
                <button
                  onClick={handleCancelTitleEdit}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h2 className="text-base font-extrabold text-white tracking-tight">
                {workoutTitle}
              </h2>
            )}
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
            onClick={() => onSave(workoutTitle)}
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
