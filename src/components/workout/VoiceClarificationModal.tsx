'use client';

import React, { useState } from 'react';
import { HelpCircle, Mic, X, Check, ArrowRight, ArrowLeft, Dumbbell, Scale } from 'lucide-react';
import { ClarificationState, ClarificationOption } from '@/types';

interface VoiceClarificationModalProps {
  clarification: ClarificationState;
  onSelectOption: (option: ClarificationOption) => void;
  onDismiss: () => void;
}

const COMMON_EXERCISES = [
  'Bench Press',
  'Incline Bench Press',
  'Barbell Row',
  'Dumbbell Row',
  'Overhead Press',
  'Lat Pulldown',
  'Squat',
  'Deadlift',
  'Bicep Curl',
  'Tricep Pushdown',
];

export function VoiceClarificationModal({
  clarification,
  onSelectOption,
  onDismiss,
}: VoiceClarificationModalProps) {
  const [viewMode, setViewMode] = useState<'OPTIONS' | 'CHOOSE_EXERCISE' | 'ENTER_WEIGHT'>('OPTIONS');
  const [customExerciseInput, setCustomExerciseInput] = useState('');
  const [customWeightInput, setCustomWeightInput] = useState('');

  const handleOptionClick = (option: ClarificationOption) => {
    // If athlete clicks "Choose another exercise", open inline exercise selection
    if (option.action === 'REJECT' && clarification.step === 'CONFIRM_EXERCISE') {
      setViewMode('CHOOSE_EXERCISE');
      return;
    }

    // If athlete clicks "Say another weight", open inline weight entry
    if (
      option.action === 'CORRECT' &&
      (clarification.step === 'ASK_WEIGHT' || option.label.toLowerCase().includes('weight'))
    ) {
      setViewMode('ENTER_WEIGHT');
      return;
    }

    onSelectOption(option);
  };

  const handleConfirmCustomExercise = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSelectOption({
      label: trimmed,
      action: 'CORRECT',
      value: trimmed,
    });
  };

  const handleConfirmCustomWeight = () => {
    const val = parseFloat(customWeightInput);
    if (!isNaN(val) && val >= 0) {
      onSelectOption({
        label: `${val} ${clarification.unit}`,
        action: 'SET_VALUE',
        value: val,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl">
        {/* Header Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 flex items-center justify-center">
              <HelpCircle className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-lime-400">
              {viewMode === 'CHOOSE_EXERCISE'
                ? 'SELECT REPLACEMENT'
                : viewMode === 'ENTER_WEIGHT'
                ? 'SPECIFY WEIGHT'
                : 'CLARIFICATION NEEDED'}
            </span>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Known Values Pill */}
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300">
          <span className="text-zinc-500 font-semibold">Captured:</span>
          {clarification.exerciseName || clarification.suggestedExercise ? (
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 font-bold text-white flex items-center gap-1">
              <Dumbbell className="h-3 w-3 text-lime-400" />
              {clarification.exerciseName || clarification.suggestedExercise}
            </span>
          ) : null}
          {clarification.setNumber ? (
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 font-mono text-lime-400 font-bold">
              Set #{clarification.setNumber}
            </span>
          ) : null}
          {clarification.reps ? (
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 font-mono text-amber-300 font-bold">
              {clarification.reps} reps
            </span>
          ) : null}
          {clarification.weight !== undefined ? (
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 font-mono text-blue-300 font-bold flex items-center gap-1">
              <Scale className="h-3 w-3 text-blue-400" />
              {clarification.weight} {clarification.unit}
            </span>
          ) : null}
        </div>

        {/* VIEW 1: Main Clarification Options */}
        {viewMode === 'OPTIONS' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white tracking-tight">
                {clarification.questionPrompt}
              </h3>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 pt-0.5">
                <Mic className="h-3 w-3 text-lime-400 animate-pulse" />
                <span>Speak your answer or tap an option below</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              {clarification.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(option)}
                  className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center justify-between transition cursor-pointer ${
                    idx === 0
                      ? 'bg-lime-400 hover:bg-lime-300 text-black shadow-[0_0_15px_rgba(163,230,53,0.25)]'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-750'
                  }`}
                >
                  <span>{option.label}</span>
                  {idx === 0 ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 2: Choose Another Exercise */}
        {viewMode === 'CHOOSE_EXERCISE' && (
          <div className="space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-black text-white">Choose Replacement Exercise</h3>
                <p className="text-xs text-zinc-400">
                  Reps ({clarification.reps ?? 10}) and weight ({clarification.weight ?? 0} {clarification.unit}) will be preserved.
                </p>
              </div>
              <button
                onClick={() => setViewMode('OPTIONS')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-300 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            </div>

            {/* Custom Input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customExerciseInput}
                onChange={(e) => setCustomExerciseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmCustomExercise(customExerciseInput);
                }}
                placeholder="Type exercise name..."
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-400 transition"
                autoFocus
              />
              <button
                onClick={() => handleConfirmCustomExercise(customExerciseInput)}
                disabled={!customExerciseInput.trim()}
                className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs rounded-xl disabled:opacity-40 transition cursor-pointer"
              >
                Confirm
              </button>
            </div>

            {/* Common Exercise Quick Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Quick Select
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {COMMON_EXERCISES.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleConfirmCustomExercise(name)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700/60 transition cursor-pointer active:scale-95"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1 border-t border-zinc-800/80">
              <Mic className="h-3 w-3 text-lime-400 animate-pulse" />
              <span>Or speak: “No, Barbell Row”</span>
            </p>
          </div>
        )}

        {/* VIEW 3: Say/Enter Another Weight */}
        {viewMode === 'ENTER_WEIGHT' && (
          <div className="space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-black text-white">Enter Set Weight</h3>
                <p className="text-xs text-zinc-400">
                  For {clarification.exerciseName || clarification.suggestedExercise || 'Exercise'} ({clarification.reps ?? 10} reps)
                </p>
              </div>
              <button
                onClick={() => setViewMode('OPTIONS')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-300 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            </div>

            {/* Numeric Input */}
            <div className="flex gap-2 items-center pt-1">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={customWeightInput}
                  onChange={(e) => setCustomWeightInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmCustomWeight();
                  }}
                  placeholder="e.g. 50"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-400 transition"
                  autoFocus
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-zinc-500 uppercase">
                  {clarification.unit}
                </span>
              </div>
              <button
                onClick={handleConfirmCustomWeight}
                disabled={!customWeightInput || isNaN(parseFloat(customWeightInput))}
                className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs rounded-xl disabled:opacity-40 transition cursor-pointer"
              >
                Save
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1 border-t border-zinc-800/80">
              <Mic className="h-3 w-3 text-lime-400 animate-pulse" />
              <span>Or speak your weight aloud (e.g. “50 {clarification.unit}” or “50”)</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
