'use client';

import { useState, useMemo } from 'react';
import { Workout, WeightUnit } from '@/types';
import { TrendingUp, Award, Zap, ChevronRight, Trophy, Sparkles } from 'lucide-react';
import { formatDate } from '@/lib/utils/cn';
import { convertWeight, calculateSetVolume } from '@/lib/utils/unitConversion';

interface ProgressiveOverloadSectionProps {
  workoutHistory: Workout[];
  preferredUnit?: WeightUnit;
}

interface DataPoint {
  date: string;
  formattedDate: string;
  topWeight: number;
  reps: number;
  estimated1RM: number;
  volume: number;
  isPR: boolean;
}

export function ProgressiveOverloadSection({
  workoutHistory,
  preferredUnit = 'kg',
}: ProgressiveOverloadSectionProps) {
  // Extract all unique exercises logged in history
  const availableExercises = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of workoutHistory) {
      for (const ex of w.exercises) {
        if (ex.exerciseName) {
          counts[ex.exerciseName] = (counts[ex.exerciseName] || 0) + 1;
        }
      }
    }

    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    if (sorted.length === 0) {
      return ['Bench Press', 'Squat', 'Deadlift', 'Shoulder Press'];
    }
    return sorted;
  }, [workoutHistory]);

  const [selectedExercise, setSelectedExercise] = useState<string>(availableExercises[0] || 'Bench Press');
  const [metricMode, setMetricMode] = useState<'weight' | '1rm' | 'volume'>('weight');
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  // Compute progression curve for selected exercise across historical sessions
  const { dataPoints, overallDelta, percentIncrease, peakValue, milestoneCount } = useMemo(() => {
    // Sort chronological (oldest to newest)
    const sortedWorkouts = [...workoutHistory].sort(
      (a, b) => new Date(a.completedAt || a.startedAt).getTime() - new Date(b.completedAt || b.startedAt).getTime()
    );

    const points: DataPoint[] = [];
    let maxWeightSoFar = 0;
    let prsCount = 0;

    for (const w of sortedWorkouts) {
      const matchEx = w.exercises.find(
        (ex) => ex.exerciseName.toLowerCase() === selectedExercise.toLowerCase()
      );

      if (matchEx && matchEx.sets.length > 0) {
        let bestWeight = 0;
        let bestReps = 0;
        let exVolume = 0;

        for (const s of matchEx.sets) {
          if (s.isCompleted !== false) {
            const wVal = Math.round(convertWeight(s.weight, s.unit, preferredUnit) * 10) / 10;
            const rVal = Number(s.reps) || 0;
            exVolume += calculateSetVolume(s.weight, s.reps, s.unit, preferredUnit);

            if (wVal > bestWeight || (wVal === bestWeight && rVal > bestReps)) {
              bestWeight = wVal;
              bestReps = rVal;
            }
          }
        }

        if (bestWeight > 0) {
          // Brzycki 1RM formula: weight * (36 / (37 - reps))
          const e1RM = bestReps > 1 ? Math.round(bestWeight * (36 / (37 - Math.min(36, bestReps)))) : bestWeight;
          const isPR = bestWeight > maxWeightSoFar;
          if (isPR) {
            maxWeightSoFar = bestWeight;
            prsCount++;
          }

          const rawDate = w.completedAt || w.startedAt;
          points.push({
            date: rawDate,
            formattedDate: formatDate(rawDate),
            topWeight: bestWeight,
            reps: bestReps,
            estimated1RM: e1RM,
            volume: exVolume,
            isPR,
          });
        }
      }
    }

    // Baseline fallback if user has no workouts logged yet for this movement
    if (points.length === 0) {
      const demoNow = new Date();
      const demoPoints: DataPoint[] = [
        {
          date: new Date(demoNow.getTime() - 21 * 86400000).toISOString(),
          formattedDate: '3 weeks ago',
          topWeight: 60,
          reps: 10,
          estimated1RM: 80,
          volume: 1800,
          isPR: false,
        },
        {
          date: new Date(demoNow.getTime() - 14 * 86400000).toISOString(),
          formattedDate: '2 weeks ago',
          topWeight: 65,
          reps: 8,
          estimated1RM: 83,
          volume: 2000,
          isPR: true,
        },
        {
          date: new Date(demoNow.getTime() - 7 * 86400000).toISOString(),
          formattedDate: 'Last week',
          topWeight: 70,
          reps: 8,
          estimated1RM: 89,
          volume: 2200,
          isPR: true,
        },
        {
          date: demoNow.toISOString(),
          formattedDate: 'Today (Target)',
          topWeight: 75,
          reps: 8,
          estimated1RM: 95,
          volume: 2400,
          isPR: true,
        },
      ];
      return {
        dataPoints: demoPoints,
        overallDelta: 15,
        percentIncrease: 25,
        peakValue: 75,
        milestoneCount: 3,
      };
    }

    const first = points[0];
    const last = points[points.length - 1];

    let startVal = metricMode === 'weight' ? first.topWeight : metricMode === '1rm' ? first.estimated1RM : first.volume;
    let endVal = metricMode === 'weight' ? last.topWeight : metricMode === '1rm' ? last.estimated1RM : last.volume;

    const delta = endVal - startVal;
    const pct = startVal > 0 ? Math.round((delta / startVal) * 100) : 0;
    const peak = Math.max(...points.map((p) => (metricMode === 'weight' ? p.topWeight : metricMode === '1rm' ? p.estimated1RM : p.volume)));

    return {
      dataPoints: points,
      overallDelta: delta,
      percentIncrease: pct,
      peakValue: peak,
      milestoneCount: prsCount,
    };
  }, [workoutHistory, selectedExercise, metricMode, preferredUnit]);

  // SVG Chart Geometry
  const svgWidth = 500;
  const svgHeight = 180;
  const paddingX = 40;
  const paddingY = 30;

  const chartPoints = useMemo(() => {
    if (dataPoints.length === 0) return [];
    const values = dataPoints.map((p) =>
      metricMode === 'weight' ? p.topWeight : metricMode === '1rm' ? p.estimated1RM : p.volume
    );

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    return dataPoints.map((p, idx) => {
      const val = metricMode === 'weight' ? p.topWeight : metricMode === '1rm' ? p.estimated1RM : p.volume;
      const x =
        dataPoints.length === 1
          ? svgWidth / 2
          : paddingX + (idx / (dataPoints.length - 1)) * (svgWidth - paddingX * 2);
      const y = svgHeight - paddingY - ((val - minVal) / range) * (svgHeight - paddingY * 2);
      return { ...p, x, y, value: val };
    });
  }, [dataPoints, metricMode]);

  const pathD = useMemo(() => {
    if (chartPoints.length === 0) return '';
    if (chartPoints.length === 1) {
      return `M ${paddingX} ${chartPoints[0].y} L ${svgWidth - paddingX} ${chartPoints[0].y}`;
    }
    return chartPoints.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      // Smooth cubic bezier curves
      const prev = chartPoints[i - 1];
      const cp1x = prev.x + (pt.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (pt.x - prev.x) / 2;
      const cp2y = pt.y;
      return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
    }, '');
  }, [chartPoints]);

  const areaD = useMemo(() => {
    if (chartPoints.length === 0 || !pathD) return '';
    const last = chartPoints[chartPoints.length - 1];
    const first = chartPoints[0];
    return `${pathD} L ${last.x} ${svgHeight - paddingY} L ${first.x} ${svgHeight - paddingY} Z`;
  }, [pathD, chartPoints]);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-0.5">
            PROGRESSION PROOF
          </span>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Progressive Overload & Benchmarks</span>
            <TrendingUp className="h-4 w-4 text-white" />
          </h2>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex p-0.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-bold">
          <button
            onClick={() => setMetricMode('weight')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              metricMode === 'weight'
                ? 'bg-white text-black font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Top Weight
          </button>
          <button
            onClick={() => setMetricMode('1rm')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              metricMode === '1rm'
                ? 'bg-white text-black font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Est. 1RM
          </button>
          <button
            onClick={() => setMetricMode('volume')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              metricMode === 'volume'
                ? 'bg-white text-black font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      {/* Movement Selector Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {availableExercises.map((exName) => {
          const isSelected = exName.toLowerCase() === selectedExercise.toLowerCase();
          return (
            <button
              key={exName}
              onClick={() => setSelectedExercise(exName)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                isSelected
                  ? 'bg-white text-black shadow-md font-extrabold'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              {exName}
            </button>
          );
        })}
      </div>

      {/* Bento Stats Row: Overload Delta & Milestone Proof */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Strength Delta */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Strength Delta
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white tracking-tight">
              {overallDelta >= 0 ? `+${overallDelta}` : overallDelta}{' '}
              <span className="text-xs font-normal text-zinc-400">
                {metricMode === 'volume' ? preferredUnit : preferredUnit}
              </span>
            </span>
          </div>
          <span className="text-[10px] font-bold text-zinc-300 mt-1">
            {percentIncrease >= 0 ? `+${percentIncrease}%` : `${percentIncrease}%`} Overload Trend
          </span>
        </div>

        {/* Peak Benchmark */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {metricMode === '1rm' ? 'Peak 1RM' : 'Peak Benchmark'}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white tracking-tight">
              {peakValue.toLocaleString()}{' '}
              <span className="text-xs font-normal text-zinc-400">{preferredUnit}</span>
            </span>
          </div>
          <span className="text-[10px] font-bold text-zinc-400 mt-1">
            Personal Record Ceiling
          </span>
        </div>

        {/* Milestone Badges */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Milestones Hit
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white tracking-tight">
              {milestoneCount}
            </span>
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <span className="text-[10px] font-bold text-zinc-300 mt-1">
            PR Thresholds Broken
          </span>
        </div>
      </div>

      {/* Visual Chart Card */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-4 space-y-3 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
              {selectedExercise} Strength Trajectory
            </span>
            <span className="text-xs font-bold text-white">
              {chartPoints.length} Sessions Logged
            </span>
          </div>

          {hoveredPoint ? (
            <div className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-700 text-right animate-in fade-in">
              <span className="text-[10px] text-zinc-400 block">{hoveredPoint.formattedDate}</span>
              <span className="text-xs font-extrabold text-white">
                {metricMode === 'weight'
                  ? `${hoveredPoint.topWeight} ${preferredUnit} × ${hoveredPoint.reps} reps`
                  : metricMode === '1rm'
                  ? `~${hoveredPoint.estimated1RM} ${preferredUnit} (Est. 1RM)`
                  : `${hoveredPoint.volume.toLocaleString()} ${preferredUnit} volume`}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-zinc-500 italic">Tap any point to inspect stats</span>
          )}
        </div>

        {/* SVG Curve */}
        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-44 select-none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="#27272a" strokeDasharray="3 3" />
            <line x1={paddingX} y1={svgHeight / 2} x2={svgWidth - paddingX} y2={svgHeight / 2} stroke="#27272a" strokeDasharray="3 3" />
            <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="#3f3f46" />

            {/* Area Fill */}
            {areaD && <path d={areaD} fill="url(#progressionGradient)" />}

            {/* Main Progression Line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Point Markers */}
            {chartPoints.map((pt, i) => {
              const isHovered = hoveredPoint?.date === pt.date;
              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onClick={() => setHoveredPoint(pt)}
                >
                  {/* Outer halo */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 8 : pt.isPR ? 6 : 4}
                    fill={pt.isPR ? '#ffffff' : '#a1a1aa'}
                    stroke="#000000"
                    strokeWidth="2"
                    className="transition-all duration-200"
                  />
                  {pt.isPR && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="10"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.8"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Chart Milestone Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-850 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#fff]" />
            <span className="text-zinc-300 font-bold">Personal Record Milestones (⭐)</span>
          </div>
          <span>Automatic Overload Tracking</span>
        </div>
      </div>
    </div>
  );
}
