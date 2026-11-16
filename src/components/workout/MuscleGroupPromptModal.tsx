'use client';

import { MuscleGroup } from '@/types';
import { MUSCLE_GROUPS_LIST, MUSCLE_GROUP_LABELS } from '@/lib/exercises/muscleGroupStore';
import { Dumbbell, X, HelpCircle } from 'lucide-react';

interface MuscleGroupPromptModalProps {
  exerciseName: string;
  isOpen: boolean;
  onSelectMuscleGroup: (group: MuscleGroup) => void;
  onClose: () => void;
}

const MUSCLE_DESCRIPTIONS: Record<MuscleGroup, string> = {
  chest: 'Pectorals, Bench Presses & Flyes',
  back: 'Lats, Rows, Pull-ups & Deadlifts',
  legs: 'Quads, Hamstrings, Glutes & Calves',
  shoulders: 'Deltoids & Overhead Presses',
  arms: 'Biceps, Triceps & Forearms',
  core: 'Abdominals, Obliques & Lower Back',
  full_body: 'Cross-Body, Compound Conditioning',
};

export function MuscleGroupPromptModal({
  exerciseName,
  isOpen,
  onSelectMuscleGroup,
  onClose,
}: MuscleGroupPromptModalProps) {
  if (!isOpen || !exerciseName) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-750 p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-750 text-white flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Unknown Muscle Group
              </span>
              <h3 className="text-base font-black text-white truncate max-w-[200px]">
                {exerciseName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Question Prompt */}
        <p className="text-xs text-zinc-300 leading-relaxed">
          Which primary muscle group does <span className="text-white font-bold">&ldquo;{exerciseName}&rdquo;</span> target?
          RepVoice will remember your choice for all future workouts and heatmaps.
        </p>

        {/* Muscle Options Grid */}
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {MUSCLE_GROUPS_LIST.map((group) => (
            <button
              key={group}
              onClick={() => onSelectMuscleGroup(group)}
              className="w-full p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-650 flex items-center justify-between text-left transition cursor-pointer group"
            >
              <div>
                <span className="text-xs font-black text-white group-hover:text-zinc-100 block">
                  {MUSCLE_GROUP_LABELS[group]}
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  {MUSCLE_DESCRIPTIONS[group]}
                </span>
              </div>
              <span className="text-xs font-bold text-zinc-500 group-hover:text-white">
                Select →
              </span>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-1 text-center">
          <span className="text-[10px] text-zinc-500">
            You can modify this anytime in your History tab.
          </span>
        </div>
      </div>
    </div>
  );
}
