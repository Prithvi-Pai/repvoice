'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Check, X, AlertCircle, Plus, Keyboard, Sparkles, RotateCcw } from 'lucide-react';
import { useSpeechRecognition } from '@/lib/voice/useSpeechRecognition';
import { parseVoiceInput } from '@/lib/voice/parser';
import { ParsedVoiceEntry, WeightUnit } from '@/types';
import { cn } from '@/lib/utils/cn';

interface VoiceLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveEntry: (entry: ParsedVoiceEntry) => void;
  contextExercise?: string;
  lastWeight?: number;
  preferredUnit?: WeightUnit;
}

export function VoiceLoggerModal({
  isOpen,
  onClose,
  onSaveEntry,
  contextExercise,
  lastWeight = 0,
  preferredUnit = 'kg',
}: VoiceLoggerModalProps) {
  const [mode, setMode] = useState<'voice' | 'manual'>('voice');
  const [manualText, setManualText] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedVoiceEntry | null>(null);

  const {
    status,
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    reset,
  } = useSpeechRecognition({
    onResult: (finalText) => {
      if (finalText.trim()) {
        const parsed = parseVoiceInput(finalText, contextExercise, lastWeight, preferredUnit);
        setParsedResult(parsed);
      }
    },
    onInterimResult: (currentText) => {
      // Live-update preview as user speaks
      if (currentText.trim().length > 3) {
        const parsed = parseVoiceInput(currentText, contextExercise, lastWeight, preferredUnit);
        setParsedResult(parsed);
      }
    },
  });

  // Automatically start listening when modal opens in voice mode
  useEffect(() => {
    if (isOpen && mode === 'voice' && isSupported) {
      setParsedResult(null);
      reset();
      const timer = setTimeout(() => {
        startListening();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopListening();
    }
  }, [isOpen, mode, isSupported, startListening, stopListening, reset]);

  if (!isOpen) return null;

  const handleManualParse = () => {
    if (!manualText.trim()) return;
    const parsed = parseVoiceInput(manualText, contextExercise, lastWeight, preferredUnit);
    setParsedResult(parsed);
  };

  const handleSave = () => {
    const toSave = parsedResult || (transcript ? parseVoiceInput(transcript, contextExercise, lastWeight, preferredUnit) : null);
    if (!toSave) return;
    stopListening();
    onSaveEntry(toSave);
    onClose();
  };

  // Adjust weight or reps in review card
  const updateSet = (index: number, field: 'weight' | 'reps', delta: number) => {
    if (!parsedResult) return;
    const updatedSets = [...parsedResult.sets];
    const target = updatedSets[index];
    if (target) {
      if (field === 'weight') {
        target.weight = Math.max(0, parseFloat((target.weight + delta).toFixed(1)));
      } else {
        target.reps = Math.max(1, target.reps + delta);
      }
      setParsedResult({ ...parsedResult, sets: updatedSets });
    }
  };

  const addExtraSet = () => {
    if (!parsedResult) return;
    const lastSet = parsedResult.sets[parsedResult.sets.length - 1];
    setParsedResult({
      ...parsedResult,
      sets: [
        ...parsedResult.sets,
        {
          weight: lastSet ? lastSet.weight : lastWeight || 40,
          reps: lastSet ? lastSet.reps : 10,
          unit: lastSet ? lastSet.unit : preferredUnit,
        },
      ],
    });
  };

  const removeSet = (index: number) => {
    if (!parsedResult || parsedResult.sets.length <= 1) return;
    setParsedResult({
      ...parsedResult,
      sets: parsedResult.sets.filter((_, i) => i !== index),
    });
  };

  const activeTranscript = transcript || interimTranscript;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-base tracking-tight">
              {mode === 'voice' ? 'Voice Logger' : 'Manual Entry'}
            </span>
            <button
              onClick={() => {
                if (mode === 'voice') {
                  stopListening();
                  setMode('manual');
                } else {
                  setMode('voice');
                  startListening();
                }
              }}
              className="text-xs text-lime-400 bg-lime-950/60 border border-lime-800/50 px-2.5 py-0.5 rounded-full hover:bg-lime-900/40 flex items-center gap-1 font-medium transition"
            >
              {mode === 'voice' ? (
                <>
                  <Keyboard className="h-3 w-3" /> Type Instead
                </>
              ) : (
                <>
                  <Mic className="h-3 w-3" /> Use Voice
                </>
              )}
            </button>
          </div>
          <button
            onClick={() => {
              stopListening();
              onClose();
            }}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Permission Denied State */}
          {status === 'permission_denied' && (
            <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-sm flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Microphone Permission Blocked</p>
                <p className="text-xs text-rose-300 mt-1">
                  Please tap your browser URL lock icon and allow microphone access, or switch to manual typing below.
                </p>
                <button
                  onClick={() => setMode('manual')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-rose-900/80 border border-rose-700/60 text-xs font-semibold text-white"
                >
                  Switch to Manual Entry
                </button>
              </div>
            </div>
          )}

          {/* Unsupported Browser State */}
          {status === 'unsupported' && (
            <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-800/60 text-amber-300 text-sm flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Browser Speech API Not Supported</p>
                <p className="text-xs text-amber-300 mt-1">
                  Web Speech is natively supported in Chrome, Safari, and Edge. Type your workout details manually below.
                </p>
              </div>
            </div>
          )}

          {/* Voice Mode Main Area */}
          {mode === 'voice' && status !== 'permission_denied' && status !== 'unsupported' && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              {/* Mic Circle */}
              <button
                onClick={isListening ? stopListening : startListening}
                className={cn(
                  'relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl active:scale-95 cursor-pointer',
                  isListening
                    ? 'bg-lime-400 text-black animate-pulse-mic shadow-[0_0_30px_rgba(163,230,53,0.5)]'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700'
                )}
              >
                {isListening ? (
                  <Mic className="h-10 w-10 text-black animate-bounce" />
                ) : (
                  <MicOff className="h-10 w-10 text-zinc-400" />
                )}
              </button>

              <div className="mt-3">
                <span className="text-xs font-bold uppercase tracking-wider text-lime-400">
                  {isListening ? 'Listening... Speak Your Sets' : 'Tap Mic to Start Speaking'}
                </span>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-xs mx-auto">
                  “Bench press 60 kilos 10 reps, then 70 kilos 8 reps”
                </p>
              </div>

              {/* Live Transcript Bubble */}
              {activeTranscript && (
                <div className="w-full mt-3 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-left">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                    Speech Detected
                  </span>
                  <p className="text-sm text-zinc-200 font-medium">
                    {transcript}
                    <span className="text-lime-400 italic"> {interimTranscript}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry Fallback Area */}
          {(mode === 'manual' || status === 'unsupported' || status === 'permission_denied') && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300">
                Spoken or written workout instructions:
              </label>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="e.g. Squat 100 kg 5 reps, then 110 kg 5 reps"
                rows={3}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-lime-400"
              />
              <button
                onClick={handleManualParse}
                className="w-full py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-[0_0_15px_rgba(163,230,53,0.2)] cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>Parse Exercise & Sets</span>
              </button>
            </div>
          )}

          {/* Parsed Review Card (Displays detected exercise and sets) */}
          {parsedResult && (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-lime-400/40 space-y-4 animate-in slide-in-from-bottom-2 duration-300 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-lime-400 block mb-0.5">
                    Recognized Exercise
                  </span>
                  <input
                    type="text"
                    value={parsedResult.exercise}
                    onChange={(e) =>
                      setParsedResult({ ...parsedResult, exercise: e.target.value })
                    }
                    className="w-full bg-transparent font-extrabold text-lg text-white border-b border-zinc-800 hover:border-zinc-700 focus:border-lime-400 focus:outline-none pb-0.5"
                    placeholder="Exercise name"
                  />
                </div>
                <button
                  onClick={addExtraSet}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1 border border-zinc-700 transition"
                >
                  <Plus className="h-3 w-3 text-lime-400" /> Set
                </button>
              </div>

              {/* Set list */}
              <div className="space-y-2">
                {parsedResult.sets.map((set, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-zinc-800"
                  >
                    <span className="text-xs font-bold text-zinc-400 w-12">
                      Set {idx + 1}
                    </span>

                    {/* Weight Stepper */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateSet(idx, 'weight', -2.5)}
                        className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center hover:bg-zinc-700 active:scale-95 text-xs font-bold"
                      >
                        -
                      </button>
                      <div className="text-center min-w-[54px]">
                        <span className="font-extrabold text-white text-sm">{set.weight}</span>
                        <span className="text-[10px] text-zinc-400 ml-0.5">{set.unit}</span>
                      </div>
                      <button
                        onClick={() => updateSet(idx, 'weight', 2.5)}
                        className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center hover:bg-zinc-700 active:scale-95 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>

                    {/* Reps Stepper */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateSet(idx, 'reps', -1)}
                        className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center hover:bg-zinc-700 active:scale-95 text-xs font-bold"
                      >
                        -
                      </button>
                      <div className="text-center min-w-[46px]">
                        <span className="font-extrabold text-white text-sm">{set.reps}</span>
                        <span className="text-[10px] text-zinc-400 ml-0.5">reps</span>
                      </div>
                      <button
                        onClick={() => updateSet(idx, 'reps', 1)}
                        className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center hover:bg-zinc-700 active:scale-95 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>

                    {/* Delete Set */}
                    {parsedResult.sets.length > 1 && (
                      <button
                        onClick={() => removeSet(idx)}
                        className="text-zinc-500 hover:text-rose-400 p-1 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setParsedResult(null);
                    reset();
                    if (mode === 'voice') startListening();
                  }}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-700 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Re-record
                </button>

                <button
                  onClick={handleSave}
                  className="flex-2 w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(163,230,53,0.3)] active:scale-95 transition cursor-pointer"
                >
                  <Check className="h-4 w-4 stroke-[3]" /> Register Under Workout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
