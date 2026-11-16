'use client';

import { useState, useMemo } from 'react';
import { Workout, MuscleGroup, Gender } from '@/types';
import {
  MUSCLE_GROUPS_LIST,
  MUSCLE_GROUP_LABELS,
  identifyExerciseMuscleGroup,
  getCustomExerciseMuscles,
} from '@/lib/exercises/muscleGroupStore';
import { AnatomicalHeatmap } from './AnatomicalHeatmap';
import { AlertCircle, Activity, ChevronRight, Sparkles } from 'lucide-react';

interface MuscleDistributionSectionProps {
  workoutHistory: Workout[];
  gender?: Gender;
  preferredUnit?: string;
}

export function MuscleDistributionSection({
  workoutHistory,
  gender = 'male',
  preferredUnit = 'kg',
}: MuscleDistributionSectionProps) {
  const [timeframe, setTimeframe] = useState<'30d' | 'year' | 'all'>('30d');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);

  // Compute muscle group statistics based on selected timeframe
  const { muscleStats, totalVolume, neglectedMuscles, topMuscles } = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (timeframe === '30d') {
      cutoff.setDate(now.getDate() - 30);
    } else if (timeframe === 'year') {
      cutoff.setFullYear(now.getFullYear() - 1);
    } else {
      cutoff.setTime(0); // All time
    }

    const filteredWorkouts = workoutHistory.filter((w) => {
      const date = new Date(w.completedAt || w.startedAt);
      return date >= cutoff;
    });

    const customs = getCustomExerciseMuscles();

    // Initialize map
    const stats: Record<
      MuscleGroup,
      {
        sets: number;
        volume: number;
        percentage: number;
        lastTrainedDate: Date | null;
        lastTrainedDaysAgo: number | null;
      }
    > = {
      chest: { sets: 0, volume: 0, percentage: 0, lastTrainedDate: null, lastTrainedDaysAgo: null },
      back: { sets: 0, volume: 0, percentage: 0, lastTrainedDate: null, lastTrainedDaysAgo: null },
      legs: { sets: 0, volume: 0, percentage: 0, lastTrainedDate: null, lastTrainedDaysAgo: null },
      shoulders: { sets: 0, volume: 0, percentage: 0, lastTrainedDate: null, lastTrainedDaysAgo: null },
      arms: { sets: 0, volume: 0, percentage: 0, lastTrainedDate: null, lastTrainedDaysAgo: null },
      core: { sets: 0, volume: 0, percentage: 0, lastTrainedDate: null, lastTrainedDaysAgo: null },
      full_body: { sets: 0, volume: 0, percentage: 0, lastTrainedDate: null, lastTrainedDaysAgo: null },
    };

    let totalCalculatedVolume = 0;

    for (const w of filteredWorkouts) {
      const wDate = new Date(w.completedAt || w.startedAt);

      for (const ex of w.exercises) {
        const { muscleGroup } = identifyExerciseMuscleGroup(ex.exerciseName, customs);

        for (const s of ex.sets) {
          if (s.isCompleted !== false) {
            const vol = (Number(s.weight) || 0) * (Number(s.reps) || 0);
            stats[muscleGroup].sets += 1;
            stats[muscleGroup].volume += vol;
            totalCalculatedVolume += vol;

            if (!stats[muscleGroup].lastTrainedDate || wDate > stats[muscleGroup].lastTrainedDate!) {
              stats[muscleGroup].lastTrainedDate = wDate;
            }
          }
        }
      }
    }

    // Calculate percentages and days ago
    for (const mg of MUSCLE_GROUPS_LIST) {
      stats[mg].percentage =
        totalCalculatedVolume > 0
          ? Math.round((stats[mg].volume / totalCalculatedVolume) * 100)
          : 0;

      if (stats[mg].lastTrainedDate) {
        const diffMs = now.getTime() - stats[mg].lastTrainedDate!.getTime();
        stats[mg].lastTrainedDaysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    // Identify neglected muscle groups (volume < 8% or > 12 days since trained, ignoring full_body)
    const primaryMuscles: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
    const neglected = primaryMuscles.filter((mg) => {
      if (filteredWorkouts.length === 0) return false;
      const isLowShare = stats[mg].percentage < 8;
      const isOverdue =
        stats[mg].lastTrainedDaysAgo === null || stats[mg].lastTrainedDaysAgo! >= 10;
      return isLowShare || isOverdue;
    });

    // Top muscles by volume share
    const top = [...primaryMuscles]
      .filter((mg) => stats[mg].volume > 0)
      .sort((a, b) => stats[b].volume - stats[a].volume);

    return {
      muscleStats: stats,
      totalVolume: totalCalculatedVolume,
      neglectedMuscles: neglected,
      topMuscles: top,
    };
  }, [workoutHistory, timeframe]);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-0.5">
            PHYSIQUE & SYMMETRY
          </span>
          <h2 className="text-xl font-black text-white tracking-tight">
            Muscle Group Distribution
          </h2>
        </div>

        {/* Timeframe Filter Tabs */}
        <div className="flex p-0.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-bold">
          <button
            onClick={() => setTimeframe('30d')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              timeframe === '30d' ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeframe('year')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              timeframe === 'year' ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Year
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              timeframe === 'all' ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Neglected Muscle Warning Banner */}
      {neglectedMuscles.length > 0 && workoutHistory.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/90 flex items-start gap-3 shadow-md">
          <AlertCircle className="h-4 w-4 text-zinc-300 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block mb-0.5">
              Attention: Neglected Training Areas
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {neglectedMuscles.map((mg) => MUSCLE_GROUP_LABELS[mg]).join(', ')}{' '}
              {neglectedMuscles.length === 1 ? 'has' : 'have'} received minimal volume in the selected period.
              Prioritize {neglectedMuscles.map((mg) => MUSCLE_GROUP_LABELS[mg]).join(' or ')} in your next session to preserve balanced structural symmetry.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Interactive Body Heatmap + Distribution Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visual Vector Heatmap (Gender-Adaptive) */}
        <div>
          <AnatomicalHeatmap
            gender={gender}
            muscleData={muscleStats}
            onSelectMuscle={(m) => setSelectedMuscle(m)}
          />
        </div>

        {/* Volume & Set Distribution Breakdown */}
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-4 space-y-3.5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Muscle Group
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Share of Volume
              </span>
            </div>

            <div className="space-y-3 mt-3">
              {(['chest', 'back', 'legs', 'shoulders', 'arms', 'core'] as MuscleGroup[]).map((mg) => {
                const stat = muscleStats[mg];
                const isSelected = selectedMuscle === mg;
                const isNeglected = neglectedMuscles.includes(mg) && workoutHistory.length > 0;

                return (
                  <div
                    key={mg}
                    onClick={() => setSelectedMuscle(isSelected ? null : mg)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900 border-white'
                        : 'bg-zinc-900/60 border-zinc-850 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-white">
                          {MUSCLE_GROUP_LABELS[mg]}
                        </span>
                        {isNeglected && (
                          <span className="text-[9px] font-bold text-zinc-400 bg-zinc-950 px-1.5 py-0.2 rounded border border-zinc-800 uppercase">
                            Neglected
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-400 text-[11px]">
                          {stat.sets} {stat.sets === 1 ? 'set' : 'sets'}
                        </span>
                        <span className="font-extrabold text-white tabular-nums">
                          {stat.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          stat.percentage >= 22
                            ? 'bg-white shadow-[0_0_8px_#fff]'
                            : stat.percentage >= 10
                            ? 'bg-zinc-400'
                            : 'bg-zinc-600'
                        }`}
                        style={{ width: `${Math.min(100, stat.percentage * 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Summary Footnote */}
          <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Total Logged Volume:</span>
            <span className="font-black text-white">
              {Math.round(totalVolume).toLocaleString()} {preferredUnit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
