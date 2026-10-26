'use client';

import React from 'react';
import { HelpCircle, Mic, X, Check, ArrowRight } from 'lucide-react';
import { ClarificationState, ClarificationOption } from '@/types';

interface VoiceClarificationModalProps {
  clarification: ClarificationState;
  onSelectOption: (option: ClarificationOption) => void;
  onDismiss: () => void;
}

export function VoiceClarificationModal({
  clarification,
  onSelectOption,
  onDismiss,
}: VoiceClarificationModalProps) {
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
              CLARIFICATION NEEDED
            </span>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main Question */}
        <div className="space-y-1">
          <h3 className="text-lg font-black text-white tracking-tight">
            {clarification.questionPrompt}
          </h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1.5 pt-0.5">
            <Mic className="h-3 w-3 text-lime-400 animate-pulse" />
            <span>Speak your answer or tap an option below</span>
          </p>
        </div>

        {/* Current Known Values Pill */}
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300">
          <span className="text-zinc-500 font-semibold">Captured:</span>
          {clarification.exerciseName || clarification.suggestedExercise ? (
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 font-bold text-white">
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
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 font-mono text-blue-300 font-bold">
              {clarification.weight} {clarification.unit}
            </span>
          ) : null}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2 pt-1">
          {clarification.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => onSelectOption(option)}
              className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center justify-between transition cursor-pointer ${
                idx === 0
                  ? 'bg-lime-400 hover:bg-lime-300 text-black shadow-[0_0_15px_rgba(163,230,53,0.25)]'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-750'
              }`}
            >
              <span>{option.label}</span>
              {idx === 0 ? <Check className="h-4 w-4 stroke-[3]" /> : <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
