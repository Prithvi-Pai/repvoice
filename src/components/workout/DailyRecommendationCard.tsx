'use client';

import { useState } from 'react';
import {
  Sparkles,
  Dumbbell,
  Play,
  RotateCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  HelpCircle,
  Moon,
  Info,
  ArrowRight,
} from 'lucide-react';
import {
  DailyWorkoutRecommendation,
  RecommendedExerciseItem,
  Workout,
  WeightUnit,
} from '@/types';
import {
  swapRecommendedExercise,
  skipRecommendedExercise,
} from '@/lib/recommendation/recommendationEngine';

interface DailyRecommendationCardProps {
  recommendation: DailyWorkoutRecommendation;
  workouts: Workout[];
  preferredUnit: WeightUnit;
  onAcceptWorkout: (rec: DailyWorkoutRecommendation) => void;
  onDismiss: () => void;
  onOverrideRestDay?: () => void;
}

export function DailyRecommendationCard({
  recommendation: initialRecommendation,
  workouts,
  preferredUnit,
  onAcceptWorkout,
  onDismiss,
  onOverrideRestDay,
}: DailyRecommendationCardProps) {
  const [recommendation, setRecommendation] = useState<DailyWorkoutRecommendation>(initialRecommendation);
  const [activeSwapExerciseId, setActiveSwapExerciseId] = useState<string | null>(null);
  const [showAllVariations, setShowAllVariations] = useState<Record<string, boolean>>({});

  const handleSwap = (exerciseId: string, newName: string) => {
    const updated = swapRecommendedExercise(
      recommendation,
      exerciseId,
      newName,
      workouts,
      preferredUnit
    );
    setRecommendation(updated);
    setActiveSwapExerciseId(null);
  };

  const handleSkip = (exerciseId: string) => {
    const updated = skipRecommendedExercise(recommendation, exerciseId);
    setRecommendation(updated);
    if (activeSwapExerciseId === exerciseId) {
      setActiveSwapExerciseId(null);
    }
  };

  // Case: Rest Day Recommendation
  if (recommendation.isRestDay) {
    return (
      <div className="p-5 rounded-3xl bg-zinc-900/90 border border-blue-500/30 shadow-[0_0_25px_rgba(59,130,246,0.1)] space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Moon className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 block">
                YOUR WORKOUT FOR TODAY
              </span>
              <h3 className="text-lg font-black text-white">{recommendation.title}</h3>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg"
            title="Dismiss suggestion"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-300">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Why this recommendation?</span>
          </div>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            {recommendation.explanation}
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onDismiss}
            className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Check className="h-4 w-4 text-blue-400" />
            <span>Accept Rest Day</span>
          </button>

          {onOverrideRestDay && (
            <button
              onClick={onOverrideRestDay}
              className="px-4 py-3 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold text-xs transition cursor-pointer"
            >
              Train Anyway
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case: Active Workout Recommendation
  return (
    <div className="p-5 rounded-3xl bg-zinc-900/90 border border-lime-400/40 shadow-[0_0_30px_rgba(163,230,53,0.12)] space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-lime-400" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-lime-400">
              YOUR WORKOUT FOR TODAY
            </span>
            {recommendation.isPersonalized ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-lime-400/10 text-lime-400 border border-lime-400/30">
                Personalized
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-zinc-800 text-zinc-400">
                Starter Routine
              </span>
            )}
          </div>
          <h3 className="text-xl font-black text-white">{recommendation.title}</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{recommendation.subtitle}</p>
        </div>

        <button
          onClick={onDismiss}
          className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg"
          title="Dismiss suggestion"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Explainability Banner */}
      <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-start gap-2 text-xs">
        <Info className="h-3.5 w-3.5 text-lime-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-zinc-300 text-[11px] leading-relaxed">
            <span className="font-bold text-white">Why recommended: </span>
            {recommendation.explanation}
          </p>
        </div>
      </div>

      {/* Suggested Exercises List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold px-1">
          <span>SUGGESTED EXERCISES ({recommendation.exercises.length})</span>
          <span className="text-[10px] text-zinc-500">Tap icon to swap or skip</span>
        </div>

        {recommendation.exercises.length === 0 ? (
          <div className="p-4 text-center rounded-2xl bg-zinc-950 border border-dashed border-zinc-800 text-xs text-zinc-400">
            All exercises skipped. You can start an empty workout or reset suggestions.
          </div>
        ) : (
          recommendation.exercises.map((item: RecommendedExerciseItem) => {
            const isSwapping = activeSwapExerciseId === item.id;

            return (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-zinc-950/90 border border-zinc-800 hover:border-zinc-700 transition space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{item.exerciseName}</span>
                      <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 border border-zinc-750">
                        {item.muscleGroup}
                      </span>
                    </div>

                    <div className="text-xs text-lime-400 font-bold mt-0.5 flex items-center gap-2">
                      <span>
                        {item.targetSets} sets × {item.targetReps} reps
                      </span>
                      {item.targetWeight ? (
                        <span className="text-zinc-300 font-mono">
                          @ {item.targetWeight} {item.unit}
                        </span>
                      ) : (
                        <span className="text-zinc-500 font-normal italic text-[11px]">
                          (Choose starting weight)
                        </span>
                      )}
                    </div>

                    {item.progressionNote && (
                      <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                        • {item.progressionNote}
                      </p>
                    )}
                  </div>

                  {/* Exercise Control Buttons: Swap and Skip */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setActiveSwapExerciseId(isSwapping ? null : item.id)}
                      className={`p-1.5 rounded-xl border text-xs font-bold transition ${
                        isSwapping
                          ? 'bg-lime-400 text-black border-lime-400'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}
                      title="Swap for alternative variation"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleSkip(item.id)}
                      className="p-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-800/40 text-xs font-bold transition"
                      title="Skip this exercise"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Variation Swap Drawer */}
                {isSwapping && (
                  <div className="p-3 rounded-xl bg-zinc-900 border border-lime-400/30 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px] font-bold text-lime-300">
                      <span>Select Variation for {item.exerciseName}:</span>
                      <button
                        onClick={() => setActiveSwapExerciseId(null)}
                        className="text-zinc-400 hover:text-white"
                      >
                        ×
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {item.variations.map((v) => (
                        <button
                          key={v.name}
                          onClick={() => handleSwap(item.id, v.name)}
                          className="w-full text-left p-2 rounded-lg bg-zinc-950 hover:bg-lime-400/10 hover:border-lime-400/40 border border-zinc-800 text-xs text-zinc-200 flex items-center justify-between group transition"
                        >
                          <div>
                            <span className="font-bold text-white group-hover:text-lime-300">
                              {v.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 block">{v.reason}</span>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-lime-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Target Disclaimer Note */}
      <p className="text-[10px] text-zinc-500 italic px-1">
        * Targets are suggested guidelines based on your logs, not guaranteed capabilities.
      </p>

      {/* Primary Actions */}
      <div className="space-y-2 pt-1">
        <button
          onClick={() => onAcceptWorkout(recommendation)}
          disabled={recommendation.exercises.length === 0}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-lime-400 to-lime-300 hover:from-lime-300 hover:to-lime-200 disabled:opacity-40 text-black font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(163,230,53,0.3)] active:scale-95 transition cursor-pointer"
        >
          <Play className="h-4 w-4 text-black fill-black" />
          <span>START RECOMMENDED WORKOUT</span>
        </button>

        <button
          onClick={onDismiss}
          className="w-full py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs font-bold border border-zinc-800 transition cursor-pointer"
        >
          Dismiss &amp; Choose Own Workout
        </button>
      </div>
    </div>
  );
}
