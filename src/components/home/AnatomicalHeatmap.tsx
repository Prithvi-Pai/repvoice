'use client';

import { useState } from 'react';
import { MuscleGroup, Gender } from '@/types';
import { MUSCLE_GROUP_LABELS } from '@/lib/exercises/muscleGroupStore';

interface MuscleData {
  sets: number;
  volume: number;
  percentage: number;
  lastTrainedDaysAgo?: number | null;
}

interface AnatomicalHeatmapProps {
  gender: Gender;
  muscleData: Record<MuscleGroup, MuscleData>;
  onSelectMuscle?: (muscle: MuscleGroup) => void;
}

export function AnatomicalHeatmap({
  gender = 'male',
  muscleData,
  onSelectMuscle,
}: AnatomicalHeatmapProps) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [activeHoverMuscle, setActiveHoverMuscle] = useState<MuscleGroup | null>(null);

  const isFemale = gender === 'female';

  // Helper to determine intensity level (0: neglected/untrained, 1: low, 2: moderate, 3: high)
  const getIntensityColor = (muscle: MuscleGroup) => {
    const data = muscleData[muscle];
    const pct = data?.percentage || 0;
    if (pct === 0) return '#18181b'; // zinc-900 / neglected
    if (pct < 10) return '#3f3f46'; // zinc-700 / low
    if (pct < 22) return '#a1a1aa'; // zinc-400 / moderate
    return '#ffffff'; // white / high heat
  };

  const getIntensityStroke = (muscle: MuscleGroup) => {
    const isHovered = activeHoverMuscle === muscle;
    if (isHovered) return '#ffffff';
    const data = muscleData[muscle];
    const pct = data?.percentage || 0;
    if (pct === 0) return '#27272a';
    if (pct >= 22) return '#ffffff';
    return '#52525b';
  };

  const hoveredInfo = activeHoverMuscle ? muscleData[activeHoverMuscle] : null;

  return (
    <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-4 space-y-3.5 shadow-lg">
      {/* Header & View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
            Anatomical Heatmap
          </span>
          <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
            <span>{isFemale ? 'Female Physique' : 'Male Physique'}</span>
            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
              {view === 'front' ? 'Anterior' : 'Posterior'}
            </span>
          </h3>
        </div>

        <div className="flex p-0.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-bold">
          <button
            onClick={() => setView('front')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              view === 'front' ? 'bg-white text-black shadow-sm font-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setView('back')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              view === 'back' ? 'bg-white text-black shadow-sm font-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Back
          </button>
        </div>
      </div>

      {/* SVG Canvas & Heatmap Silhouette */}
      <div className="relative flex justify-center items-center py-2 bg-black rounded-2xl border border-zinc-850 overflow-hidden">
        <svg
          viewBox="0 0 240 320"
          className="w-full max-w-[260px] h-[300px] select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Head & Neck Base Outline */}
          <ellipse cx="120" cy="30" rx={isFemale ? 15 : 18} ry={isFemale ? 20 : 22} fill="#18181b" stroke="#27272a" strokeWidth="1.5" />
          <path d="M 112 48 L 112 62 L 128 62 L 128 48 Z" fill="#18181b" stroke="#27272a" strokeWidth="1.5" />

          {view === 'front' ? (
            /* ============================================================== */
            /* ANTERIOR / FRONT VIEW                                          */
            /* ============================================================== */
            <g>
              {/* Shoulders (Deltoids) */}
              <g
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActiveHoverMuscle('shoulders')}
                onMouseLeave={() => setActiveHoverMuscle(null)}
                onClick={() => onSelectMuscle?.('shoulders')}
              >
                {/* Left Deltoid */}
                <path
                  d={isFemale ? "M 92 64 C 76 66, 68 76, 66 92 C 74 94, 84 88, 88 78 Z" : "M 88 64 C 68 66, 58 78, 56 96 C 68 98, 80 90, 84 80 Z"}
                  fill={getIntensityColor('shoulders')}
                  stroke={getIntensityStroke('shoulders')}
                  strokeWidth={activeHoverMuscle === 'shoulders' ? '2.5' : '1.5'}
                  filter={getIntensityColor('shoulders') === '#ffffff' ? 'url(#glow)' : undefined}
                />
                {/* Right Deltoid */}
                <path
                  d={isFemale ? "M 148 64 C 164 66, 172 76, 174 92 C 166 94, 156 88, 152 78 Z" : "M 152 64 C 172 66, 182 78, 184 96 C 172 98, 160 90, 156 80 Z"}
                  fill={getIntensityColor('shoulders')}
                  stroke={getIntensityStroke('shoulders')}
                  strokeWidth={activeHoverMuscle === 'shoulders' ? '2.5' : '1.5'}
                  filter={getIntensityColor('shoulders') === '#ffffff' ? 'url(#glow)' : undefined}
                />
              </g>

              {/* Chest (Pectorals) */}
              <g
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActiveHoverMuscle('chest')}
                onMouseLeave={() => setActiveHoverMuscle(null)}
                onClick={() => onSelectMuscle?.('chest')}
              >
                {/* Left Pec */}
                <path
                  d={isFemale ? "M 94 66 C 104 68, 118 68, 119 72 L 118 106 C 102 110, 88 102, 86 86 Z" : "M 90 66 C 102 68, 118 68, 119 72 L 118 104 C 98 108, 84 100, 82 84 Z"}
                  fill={getIntensityColor('chest')}
                  stroke={getIntensityStroke('chest')}
                  strokeWidth={activeHoverMuscle === 'chest' ? '2.5' : '1.5'}
                  filter={getIntensityColor('chest') === '#ffffff' ? 'url(#glow)' : undefined}
                />
                {/* Right Pec */}
                <path
                  d={isFemale ? "M 146 66 C 136 68, 122 68, 121 72 L 122 106 C 138 110, 152 102, 154 86 Z" : "M 150 66 C 138 68, 122 68, 121 72 L 122 104 C 142 108, 156 100, 158 84 Z"}
                  fill={getIntensityColor('chest')}
                  stroke={getIntensityStroke('chest')}
                  strokeWidth={activeHoverMuscle === 'chest' ? '2.5' : '1.5'}
                  filter={getIntensityColor('chest') === '#ffffff' ? 'url(#glow)' : undefined}
                />
              </g>

              {/* Arms (Biceps & Forearms) */}
              <g
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActiveHoverMuscle('arms')}
                onMouseLeave={() => setActiveHoverMuscle(null)}
                onClick={() => onSelectMuscle?.('arms')}
              >
                {/* Left Bicep */}
                <path
                  d={isFemale ? "M 66 94 C 64 106, 66 122, 68 132 C 76 130, 82 118, 82 100 Z" : "M 56 98 C 54 112, 56 128, 60 140 C 72 136, 78 122, 78 102 Z"}
                  fill={getIntensityColor('arms')}
                  stroke={getIntensityStroke('arms')}
                  strokeWidth={activeHoverMuscle === 'arms' ? '2.5' : '1.5'}
                />
                {/* Left Forearm */}
                <path
                  d={isFemale ? "M 67 134 C 65 150, 64 168, 62 180 C 70 178, 76 164, 76 142 Z" : "M 59 142 C 55 160, 52 178, 50 192 C 62 190, 70 172, 70 148 Z"}
                  fill={getIntensityColor('arms')}
                  stroke={getIntensityStroke('arms')}
                  strokeWidth={activeHoverMuscle === 'arms' ? '2.5' : '1.5'}
                />
                {/* Right Bicep */}
                <path
                  d={isFemale ? "M 174 94 C 176 106, 174 122, 172 132 C 164 130, 158 118, 158 100 Z" : "M 184 98 C 186 112, 184 128, 180 140 C 168 136, 162 122, 162 102 Z"}
                  fill={getIntensityColor('arms')}
                  stroke={getIntensityStroke('arms')}
                  strokeWidth={activeHoverMuscle === 'arms' ? '2.5' : '1.5'}
                />
                {/* Right Forearm */}
                <path
                  d={isFemale ? "M 173 134 C 175 150, 176 168, 178 180 C 170 178, 164 164, 164 142 Z" : "M 181 142 C 185 160, 188 178, 190 192 C 178 190, 170 172, 170 148 Z"}
                  fill={getIntensityColor('arms')}
                  stroke={getIntensityStroke('arms')}
                  strokeWidth={activeHoverMuscle === 'arms' ? '2.5' : '1.5'}
                />
              </g>

              {/* Core (Abs & Obliques) */}
              <g
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActiveHoverMuscle('core')}
                onMouseLeave={() => setActiveHoverMuscle(null)}
                onClick={() => onSelectMuscle?.('core')}
              >
                <path
                  d={isFemale
                    ? "M 94 108 L 146 108 C 142 126, 138 140, 142 154 L 98 154 C 102 140, 98 126, 94 108 Z"
                    : "M 90 106 L 150 106 C 146 124, 144 142, 146 156 L 94 156 C 96 142, 94 124, 90 106 Z"}
                  fill={getIntensityColor('core')}
                  stroke={getIntensityStroke('core')}
                  strokeWidth={activeHoverMuscle === 'core' ? '2.5' : '1.5'}
                  filter={getIntensityColor('core') === '#ffffff' ? 'url(#glow)' : undefined}
                />
              </g>

              {/* Legs (Quads & Calves) */}
              <g
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActiveHoverMuscle('legs')}
                onMouseLeave={() => setActiveHoverMuscle(null)}
                onClick={() => onSelectMuscle?.('legs')}
              >
                {/* Pelvis/Hips outline */}
                <path
                  d={isFemale
                    ? "M 94 156 C 84 168, 80 180, 84 190 L 156 190 C 160 180, 156 168, 146 156 Z"
                    : "M 94 156 C 88 166, 88 178, 92 186 L 148 186 C 152 178, 152 166, 146 156 Z"}
                  fill="#18181b"
                  stroke="#27272a"
                  strokeWidth="1.5"
                />
                {/* Left Quad */}
                <path
                  d={isFemale
                    ? "M 86 192 C 78 206, 78 230, 84 246 L 114 246 C 118 230, 116 206, 114 192 Z"
                    : "M 92 188 C 82 204, 82 230, 86 246 L 116 246 C 118 230, 118 204, 116 188 Z"}
                  fill={getIntensityColor('legs')}
                  stroke={getIntensityStroke('legs')}
                  strokeWidth={activeHoverMuscle === 'legs' ? '2.5' : '1.5'}
                  filter={getIntensityColor('legs') === '#ffffff' ? 'url(#glow)' : undefined}
                />
                {/* Right Quad */}
                <path
                  d={isFemale
                    ? "M 154 192 C 162 206, 162 230, 156 246 L 126 246 C 122 230, 124 206, 126 192 Z"
                    : "M 148 188 C 158 204, 158 230, 154 246 L 124 246 C 122 230, 122 204, 124 188 Z"}
                  fill={getIntensityColor('legs')}
                  stroke={getIntensityStroke('legs')}
                  strokeWidth={activeHoverMuscle === 'legs' ? '2.5' : '1.5'}
                  filter={getIntensityColor('legs') === '#ffffff' ? 'url(#glow)' : undefined}
                />
                {/* Left Shin/Calf */}
                <path
                  d="M 86 250 C 82 264, 84 286, 88 304 L 108 304 C 110 286, 110 264, 112 250 Z"
                  fill={getIntensityColor('legs')}
                  stroke={getIntensityStroke('legs')}
                  strokeWidth={activeHoverMuscle === 'legs' ? '2.5' : '1.5'}
                />
                {/* Right Shin/Calf */}
                <path
                  d="M 154 250 C 158 264, 156 286, 152 304 L 132 304 C 130 286, 130 264, 128 250 Z"
                  fill={getIntensityColor('legs')}
                  stroke={getIntensityStroke('legs')}
                  strokeWidth={activeHoverMuscle === 'legs' ? '2.5' : '1.5'}
                />
              </g>
            </g>
          ) : (
            /* ============================================================== */
            /* POSTERIOR / BACK VIEW                                          */
            /* ============================================================== */
            <g>
              {/* Back (Traps, Lats, Lower Back) */}
              <g
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActiveHoverMuscle('back')}
                onMouseLeave={() => setActiveHoverMuscle(null)}
                onClick={() => onSelectMuscle?.('back')}
              >
                {/* Upper Back & Traps */}
                <path
                  d={isFemale
                    ? "M 106 58 L 134 58 L 148 76 L 120 102 L 92 76 Z"
                    : "M 104 58 L 136 58 L 154 78 L 120 106 L 86 78 Z"}
                  fill={getIntensityColor('back')}
                  stroke={getIntensityStroke('back')}
                  strokeWidth={activeHoverMuscle === 'back' ? '2.5' : '1.5'}
                  filter={getIntensityColor('back') === '#ffffff' ? 'url(#glow)' : undefined}
                />
                {/* Left Lat */}
                <path
                  d={isFemale
                    ? "M 88 78 L 118 102 L 102 148 C 94 136, 86 112, 88 78 Z"
                    : "M 82 80 L 118 106 L 98 152 C 90 136, 80 114, 82 80 Z"}
                  fill={getIntensityColor('back')}
                  stroke={getIntensityStroke('back')}
                  strokeWidth={activeHoverMuscle === 'back' ? '2.5' : '1.5'}
                />
                {/* Right Lat */}
                <path
                  d={isFemale
                    ? "M 152 78 L 122 102 L 138 148 C 146 136, 154 112, 152 78 Z"
                    : "M 158 80 L 122 106 L 142 152 C 150 136, 160 114, 158 80 Z"}
                  fill={getIntensityColor('back')}
                  stroke={getIntensityStroke('back')}
                  strokeWidth={activeHoverMuscle === 'back' ? '2.5' : '1.5'}
                />
              </g>

              {/* Posterior Shoulders (Rear Delts) */}
              <g
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActiveHoverMuscle('shoulders')}
                onMouseLeave={() => setActiveHoverMuscle(null)}
                onClick={() => onSelectMuscle?.('shoulders')}
              >
                {/* Left Rear Delt */}
                <path
                  d={isFemale ? "M 90 64 C 76 66, 68 76, 66 92 C 74 94, 84 86, 86 78 Z" : "M 86 64 C 68 66, 58 78, 56 96 C 68 98, 80 88, 82 80 Z"}
                  fill={getIntensityColor('shoulders')}
                  stroke={getIntensityStroke('shoulders')}
                  strokeWidth={activeHoverMuscle === 'shoulders' ? '2.5' : '1.5'}
                />
                {/* Right Rear Delt */}
                <path
                  d={isFemale ? "M 150 64 C 164 66, 172 76, 174 92 C 166 94, 156 86, 154 78 Z" : "M 154 64 C 172 66, 182 78, 184 96 C 172 98, 160 88, 158 80 Z"}
                  fill={getIntensityColor('shoulders')}
                  stroke={getIntensityStroke('shoulders')}
                  strokeWidth={activeHoverMuscle === 'shoulders' ? '2.5' : '1.5'}
                />
              </g>

              {/* Arms (Triceps) */}
              <g
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActiveHoverMuscle('arms')}
                onMouseLeave={() => setActiveHoverMuscle(null)}
                onClick={() => onSelectMuscle?.('arms')}
              >
                {/* Left Tricep */}
                <path
                  d={isFemale ? "M 66 94 C 64 108, 66 124, 68 134 C 76 130, 80 116, 78 98 Z" : "M 56 98 C 54 114, 56 130, 60 142 C 72 136, 76 120, 74 100 Z"}
                  fill={getIntensityColor('arms')}
                  stroke={getIntensityStroke('arms')}
                  strokeWidth={activeHoverMuscle === 'arms' ? '2.5' : '1.5'}
                />
                {/* Right Tricep */}
                <path
                  d={isFemale ? "M 174 94 C 176 108, 174 124, 172 134 C 164 130, 160 116, 162 98 Z" : "M 184 98 C 186 114, 184 130, 180 142 C 168 136, 164 120, 166 100 Z"}
                  fill={getIntensityColor('arms')}
                  stroke={getIntensityStroke('arms')}
                  strokeWidth={activeHoverMuscle === 'arms' ? '2.5' : '1.5'}
                />
              </g>

              {/* Legs (Glutes, Hamstrings, Calves) */}
              <g
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActiveHoverMuscle('legs')}
                onMouseLeave={() => setActiveHoverMuscle(null)}
                onClick={() => onSelectMuscle?.('legs')}
              >
                {/* Left Glute */}
                <path
                  d={isFemale
                    ? "M 86 156 C 80 172, 84 196, 118 196 L 118 156 Z"
                    : "M 92 156 C 86 170, 88 192, 118 192 L 118 156 Z"}
                  fill={getIntensityColor('legs')}
                  stroke={getIntensityStroke('legs')}
                  strokeWidth={activeHoverMuscle === 'legs' ? '2.5' : '1.5'}
                  filter={getIntensityColor('legs') === '#ffffff' ? 'url(#glow)' : undefined}
                />
                {/* Right Glute */}
                <path
                  d={isFemale
                    ? "M 154 156 C 160 172, 156 196, 122 196 L 122 156 Z"
                    : "M 148 156 C 154 170, 152 192, 122 192 L 122 156 Z"}
                  fill={getIntensityColor('legs')}
                  stroke={getIntensityStroke('legs')}
                  strokeWidth={activeHoverMuscle === 'legs' ? '2.5' : '1.5'}
                  filter={getIntensityColor('legs') === '#ffffff' ? 'url(#glow)' : undefined}
                />
                {/* Left Hamstring */}
                <path
                  d="M 88 198 C 84 214, 84 232, 88 246 L 116 246 C 118 232, 118 214, 116 198 Z"
                  fill={getIntensityColor('legs')}
                  stroke={getIntensityStroke('legs')}
                  strokeWidth={activeHoverMuscle === 'legs' ? '2.5' : '1.5'}
                />
                {/* Right Hamstring */}
                <path
                  d="M 152 198 C 156 214, 156 232, 152 246 L 124 246 C 122 232, 122 214, 124 198 Z"
                  fill={getIntensityColor('legs')}
                  stroke={getIntensityStroke('legs')}
                  strokeWidth={activeHoverMuscle === 'legs' ? '2.5' : '1.5'}
                />
                {/* Left Calf (Gastrocnemius) */}
                <path
                  d="M 86 250 C 80 266, 82 288, 88 304 L 108 304 C 112 288, 112 266, 112 250 Z"
                  fill={getIntensityColor('legs')}
                  stroke={getIntensityStroke('legs')}
                  strokeWidth={activeHoverMuscle === 'legs' ? '2.5' : '1.5'}
                />
                {/* Right Calf */}
                <path
                  d="M 154 250 C 160 266, 158 288, 152 304 L 132 304 C 128 288, 128 266, 128 250 Z"
                  fill={getIntensityColor('legs')}
                  stroke={getIntensityStroke('legs')}
                  strokeWidth={activeHoverMuscle === 'legs' ? '2.5' : '1.5'}
                />
              </g>
            </g>
          )}
        </svg>

        {/* Legend Overlay in Bottom Corner */}
        <div className="absolute bottom-2 right-2 flex flex-col gap-1 text-[9px] font-semibold text-zinc-400 bg-zinc-950/90 backdrop-blur p-2 rounded-xl border border-zinc-800">
          <span className="text-[8px] uppercase font-bold tracking-wider text-zinc-400">Volume Heat</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-white shadow-[0_0_6px_#fff]" />
            <span className="text-white">High (≥22%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-zinc-400" />
            <span>Moderate (10-21%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-zinc-700" />
            <span>Low (1-9%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-zinc-900 border border-zinc-800" />
            <span className="text-zinc-400">Neglected (0%)</span>
          </div>
        </div>
      </div>

      {/* Selected / Hovered Muscle Detail Bar */}
      <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between min-h-[44px]">
        {activeHoverMuscle && hoveredInfo ? (
          <>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                {MUSCLE_GROUP_LABELS[activeHoverMuscle]}
              </span>
              <span className="text-xs font-black text-white">
                {hoveredInfo.percentage}% of Volume • {hoveredInfo.sets} {hoveredInfo.sets === 1 ? 'set' : 'sets'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 block">
                {hoveredInfo.lastTrainedDaysAgo !== null && hoveredInfo.lastTrainedDaysAgo !== undefined
                  ? hoveredInfo.lastTrainedDaysAgo === 0
                    ? 'Trained today'
                    : `Trained ${hoveredInfo.lastTrainedDaysAgo}d ago`
                  : 'Not trained yet'}
              </span>
              <span className="text-xs font-bold text-zinc-300">
                {Math.round(hoveredInfo.volume).toLocaleString()} volume
              </span>
            </div>
          </>
        ) : (
          <p className="text-xs text-zinc-400 italic mx-auto">
            Hover or tap any muscle group to inspect volume share & training recency.
          </p>
        )}
      </div>
    </div>
  );
}
