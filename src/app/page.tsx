'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  Check,
  Plus,
  Trash2,
  Mic,
  MicOff,
  Timer,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Flame,
  ChevronRight,
  Save,
  Dumbbell,
  Sparkles,
  Radio,
  HelpCircle,
  ShieldCheck,
  AlertCircle,
  User,
} from 'lucide-react';
import {
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WeightUnit,
  WorkoutVoiceCommand,
  PendingExerciseConfirmation,
  ClarificationState,
  ClarificationOption,
  DailyWorkoutRecommendation,
} from '@/types';
import {
  getActiveWorkout,
  saveActiveWorkout,
  saveFinishedWorkout,
  saveWorkoutLocally,
  getWorkoutHistory,
  getStoredProfile,
} from '@/lib/storage';
import { getSupabaseClient } from '@/lib/supabase/client';
import { parseWorkoutCommand } from '@/lib/voice/workoutCommandParser';
import { useContinuousWorkoutSpeech, ContinuousSpeechStatus } from '@/lib/voice/useContinuousWorkoutSpeech';
import { RestTimer } from '@/components/workout/RestTimer';
import { BottomNav } from '@/components/layout/BottomNav';
import { COMMON_EXERCISES } from '@/lib/voice/parser';
import { formatDuration } from '@/lib/utils/cn';
import {
  syncAndLoadAllAliases,
  saveLearnedAlias,
  toTitleCase,
} from '@/lib/exercises/exerciseStore';
import { VoiceClarificationModal } from '@/components/workout/VoiceClarificationModal';
import {
  ActiveSetTimerState,
  startSetTimer,
  completeSetTimer,
  formatSetDuration,
} from '@/lib/voice/setTimerManager';
import {
  evaluateClarificationNeed,
  processClarificationResponse,
} from '@/lib/voice/clarificationStateMachine';
import {
  prewarmGymNoiseReduction,
  releaseGymNoiseReduction,
} from '@/lib/voice/audioCaptureEnhancer';
import { DailyRecommendationCard } from '@/components/workout/DailyRecommendationCard';
import { generateDailyRecommendation } from '@/lib/recommendation/recommendationEngine';
import { getLocalDateKey } from '@/lib/history/dateGrouping';

export default function WorkoutPage() {
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  // Synchronous refs to prevent React state closure staleness in voice callbacks
  const activeWorkoutRef = useRef<Workout | null>(null);
  const selectedExerciseIdRef = useRef<string | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [setTimerSeconds, setSetTimerSeconds] = useState<number>(0);
  const [showRestTimer, setShowRestTimer] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [ambiguousCommand, setAmbiguousCommand] = useState<Extract<WorkoutVoiceCommand, { type: 'AMBIGUOUS' }> | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingExerciseConfirmation | null>(null);
  const [customAliases, setCustomAliases] = useState<Record<string, string>>({});
  const [showManualCorrection, setShowManualCorrection] = useState<boolean>(false);
  const [correctionInput, setCorrectionInput] = useState<string>('');
  const [showFinishConfirm, setShowFinishConfirm] = useState<boolean>(false);
  const [workoutNotes, setWorkoutNotes] = useState<string>('');
  const [quickExerciseInput, setQuickExerciseInput] = useState<string>('');
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [preferredUnit, setPreferredUnit] = useState<WeightUnit>('kg');
  const [clarificationState, setClarificationState] = useState<ClarificationState | null>(null);

  // Independent per-set active timers (keyed by set.id)
  const [activeSetTimers, setActiveSetTimers] = useState<Record<string, ActiveSetTimerState>>({});
  const activeSetTimersRef = useRef<Record<string, ActiveSetTimerState>>({});
  const [, setTimerTick] = useState<number>(0);

  const [workoutHistory, setWorkoutHistory] = useState<Workout[]>([]);
  const [dailyRecommendation, setDailyRecommendation] = useState<DailyWorkoutRecommendation | null>(null);
  const [isRecommendationDismissed, setIsRecommendationDismissed] = useState<boolean>(false);

  const refreshRecommendations = useCallback((unit: WeightUnit) => {
    getWorkoutHistory().then((res) => {
      const historyList = res.workouts || [];
      setWorkoutHistory(historyList);
      if (historyList.length > 0) {
        setLastWorkout(historyList[0]);
      }
      const todayKey = getLocalDateKey(new Date());
      const rec = generateDailyRecommendation(historyList, todayKey, unit);
      setDailyRecommendation(rec);
    });
  }, []);

  // Load active workout or past workouts on mount
  useEffect(() => {
    const profile = getStoredProfile();
    const unit = profile.preferredUnit || 'kg';
    setPreferredUnit(unit);
    refreshRecommendations(unit);

    syncAndLoadAllAliases().then((aliases) => {
      setCustomAliases(aliases);
    });

    const client = getSupabaseClient();
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (client) {
      client.auth.getUser().then(({ data }) => {
        if (data?.user?.email) setUserEmail(data.user.email);
      });

      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        setUserEmail(session?.user?.email ?? null);
      });
      authSubscription = subscription;
    }

    const current = getActiveWorkout();
    if (current) {
      activeWorkoutRef.current = current;
      setActiveWorkout(current);
      if (current.exercises.length > 0) {
        const lastExId = current.exercises[current.exercises.length - 1].id;
        selectedExerciseIdRef.current = lastExId;
        setSelectedExerciseId(lastExId);
      }
      const startMs = new Date(current.startedAt).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }

    return () => {
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, [refreshRecommendations]);

  // Workout duration counter (continuous from start to finish, never reset by set actions)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeWorkout) {
      interval = setInterval(() => {
        const startMs = new Date(activeWorkout.startedAt).getTime();
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeWorkout]);

  // Active set duration counter (measures current set until 'Set done' or next set entry)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeWorkout) {
      interval = setInterval(() => {
        setSetTimerSeconds((s) => s + 1);
      }, 1000);
    } else {
      setSetTimerSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeWorkout]);

  // Live tick effect for all active inline set timers
  useEffect(() => {
    const hasRunning = Object.values(activeSetTimers).some((t) => t.isRunning);
    if (!hasRunning) return;

    const interval = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSetTimers]);

  // Sync active workout to local storage and synchronous ref
  const updateWorkout = useCallback((updated: Workout | null) => {
    activeWorkoutRef.current = updated;
    setActiveWorkout(updated);
    saveActiveWorkout(updated);
  }, []);

  // Update selected exercise ID in both state and synchronous ref
  const updateSelectedExerciseId = useCallback((id: string | null) => {
    selectedExerciseIdRef.current = id;
    setSelectedExerciseId(id);
  }, []);

  // Start new workout session
  const handleStartWorkout = useCallback((title: string = 'Gym Workout'): Workout => {
    const newWorkout: Workout = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `w_${Date.now()}`,
      title,
      startedAt: new Date().toISOString(),
      exercises: [],
    };
    updateWorkout(newWorkout);
    updateSelectedExerciseId(null);
    setElapsedSeconds(0);
    setSetTimerSeconds(0);
    setSaveStatus(null);
    setClarificationState(null);
    setPendingConfirmation(null);
    setActiveSetTimers({});
    activeSetTimersRef.current = {};
    return newWorkout;
  }, [updateWorkout, updateSelectedExerciseId]);

  // Accept a daily recommended workout and initialize with suggested exercises
  const handleAcceptRecommendation = useCallback(
    (rec: DailyWorkoutRecommendation) => {
      const newWorkout = handleStartWorkout(rec.title);
      if (rec.exercises && rec.exercises.length > 0) {
        const initialExercises: WorkoutExercise[] = rec.exercises.map((recEx, idx) => ({
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `ex_${Date.now()}_${idx}`,
          exerciseName: recEx.exerciseName,
          sets: [],
        }));
        const populated = {
          ...newWorkout,
          exercises: initialExercises,
        };
        updateWorkout(populated);
        if (initialExercises.length > 0) {
          updateSelectedExerciseId(initialExercises[0].id);
        }
      }
      setSaveStatus({
        type: 'success',
        message: `Started ${rec.title}. Log your sets anytime by voice or tapping!`,
      });
    },
    [handleStartWorkout, updateWorkout]
  );

  // Audio confirmation chime
  const playSoundChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // ignore
    }
  }, []);

  // Get currently selected exercise object and last known weight
  const getActiveExerciseContext = useCallback((): { exercise?: WorkoutExercise; lastWeight: number } => {
    const currentW = activeWorkoutRef.current || activeWorkout;
    if (!currentW || currentW.exercises.length === 0) {
      return { lastWeight: 0 };
    }

    const currentSelectedId = selectedExerciseIdRef.current || selectedExerciseId;
    let target = currentW.exercises.find((e) => e.id === currentSelectedId);
    if (!target) {
      target = currentW.exercises[currentW.exercises.length - 1];
    }

    const lastSet = target && target.sets.length > 0 ? target.sets[target.sets.length - 1] : undefined;
    const lastWeight = lastSet ? lastSet.weight : 0;

    return { exercise: target, lastWeight };
  }, [activeWorkout, selectedExerciseId]);

  // Confirm or correct an unrecognized exercise, learn the alias, and log the pending set
  const executeConfirmExercise = useCallback(
    async (
      canonicalName: string,
      pending: PendingExerciseConfirmation
    ) => {
      const cleanName = toTitleCase(canonicalName);
      const phrase = pending.spokenPhrase;

      // 1. Immediately update local alias map state for instant recognition in next utterances
      setCustomAliases((prev) => ({
        ...prev,
        [phrase.toLowerCase().trim()]: cleanName,
      }));

      // 2. Persist alias to Supabase and localStorage asynchronously
      saveLearnedAlias(phrase, cleanName).then((res) => {
        if (!res.success || res.persistedTo === 'local_only') {
          console.info('Alias saved locally:', res.error);
        }
      });

      // 3. Clear confirmation UI state
      setPendingConfirmation(null);
      setShowManualCorrection(false);
      setCorrectionInput('');

      // 4. Ensure active workout session
      let currentWorkout = activeWorkoutRef.current || activeWorkout || handleStartWorkout('Gym Workout');

      // 5. If selection only (e.g. "Next exercise, chest press")
      if (pending.isSelectionOnly) {
        const existing = currentWorkout.exercises.find(
          (e) => e.exerciseName.toLowerCase() === cleanName.toLowerCase()
        );
        if (existing) {
          updateSelectedExerciseId(existing.id);
        } else {
          const newExId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ex_${Date.now()}`;
          const newEx: WorkoutExercise = {
            id: newExId,
            exerciseName: cleanName,
            sets: [],
          };
          updateWorkout({ ...currentWorkout, exercises: [...currentWorkout.exercises, newEx] });
          updateSelectedExerciseId(newExId);
        }
        playSoundChime();
        setSaveStatus({
          type: 'success',
          message: `Confirmed "${cleanName}". Learned alias for "${phrase}"!`,
        });
        return;
      }

      // 6. Log the pending set under the confirmed exercise exactly once
      const weight = pending.weight !== undefined ? pending.weight : 40;
      const reps = pending.reps !== undefined ? pending.reps : 10;
      const currentDuration = setTimerSeconds;
      setSetTimerSeconds(0);

      const existingIdx = currentWorkout.exercises.findIndex(
        (e) => e.exerciseName.toLowerCase() === cleanName.toLowerCase()
      );

      let updatedExercises = [...currentWorkout.exercises];
      let targetExerciseId: string;

      const targetSetNum =
        pending.setNumber !== undefined
          ? pending.setNumber
          : existingIdx >= 0
          ? updatedExercises[existingIdx].sets.length + 1
          : 1;

      const newSetsToAdd: WorkoutSet[] = [
        {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}_0`,
          setNumber: targetSetNum,
          weight,
          reps,
          unit: pending.unit,
          isCompleted: true,
          durationSeconds: currentDuration > 0 ? currentDuration : undefined,
        },
      ];

      if (pending.additionalSets) {
        pending.additionalSets.forEach((as, idx) => {
          newSetsToAdd.push({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}_${idx + 1}`,
            setNumber: targetSetNum + idx + 1,
            weight: as.weight,
            reps: as.reps,
            unit: as.unit,
            isCompleted: true,
          });
        });
      }

      if (existingIdx >= 0) {
        const ex = updatedExercises[existingIdx];
        updatedExercises[existingIdx] = {
          ...ex,
          sets: [...ex.sets, ...newSetsToAdd],
        };
        targetExerciseId = ex.id;
      } else {
        targetExerciseId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ex_${Date.now()}`;
        updatedExercises.push({
          id: targetExerciseId,
          exerciseName: cleanName,
          sets: newSetsToAdd,
        });
      }

      const updated = {
        ...currentWorkout,
        exercises: updatedExercises,
      };
      updateWorkout(updated);
      updateSelectedExerciseId(targetExerciseId);
      setShowRestTimer(true);
      playSoundChime();

      const setsCountLabel = newSetsToAdd.length > 1 ? `${newSetsToAdd.length} sets` : `Set #${targetSetNum}`;
      setSaveStatus({
        type: 'success',
        message: `Logged ${cleanName}: ${weight} ${pending.unit} × ${reps} reps. Learned alias for "${phrase}"!`,
      });
    },
    [activeWorkout, setTimerSeconds, handleStartWorkout, updateWorkout, updateSelectedExerciseId, playSoundChime]
  );

  // Execute direct set insertion/update
  const executeDirectSetCommand = useCallback(
    (
      command: {
        exercise: string;
        weight: number;
        reps: number;
        unit: WeightUnit;
        setNumber?: number;
        isOverwrite?: boolean;
      },
      currentWorkout: Workout
    ) => {
      const liveWorkout = activeWorkoutRef.current || currentWorkout;
      const existingIdx = liveWorkout.exercises.findIndex(
        (e) => e.exerciseName.toLowerCase() === command.exercise.toLowerCase()
      );

      let updatedExercises = [...liveWorkout.exercises];
      let targetExerciseId: string;
      let currentDuration = setTimerSeconds;

      const runningTimerEntry = Object.entries(activeSetTimersRef.current).find(([, t]) => t.isRunning);
      if (runningTimerEntry) {
        const [setId, timer] = runningTimerEntry;
        const timing = completeSetTimer(timer);
        currentDuration = timing.durationSeconds;
        const nextTimers = { ...activeSetTimersRef.current };
        delete nextTimers[setId];
        activeSetTimersRef.current = nextTimers;
        setActiveSetTimers(nextTimers);
      }
      setSetTimerSeconds(0);

      // Overwrite if requested
      if (
        existingIdx >= 0 &&
        command.setNumber !== undefined &&
        (command.isOverwrite || updatedExercises[existingIdx].sets.some((s) => s.setNumber === command.setNumber))
      ) {
        const ex = updatedExercises[existingIdx];
        const updatedSets = ex.sets.map((s) =>
          s.setNumber === command.setNumber
            ? {
                ...s,
                weight: command.weight,
                reps: command.reps,
                unit: command.unit,
                isCompleted: true,
                durationSeconds: currentDuration > 0 ? currentDuration : s.durationSeconds,
              }
            : s
        );
        updatedExercises[existingIdx] = { ...ex, sets: updatedSets };
        targetExerciseId = ex.id;
        setSaveStatus({
          type: 'success',
          message: `Updated Set #${command.setNumber} on ${command.exercise}: ${command.weight} ${command.unit} × ${command.reps} reps`,
        });
      } else {
        const targetSetNum =
          command.setNumber !== undefined
            ? command.setNumber
            : existingIdx >= 0
            ? updatedExercises[existingIdx].sets.length + 1
            : 1;

        const newSet: WorkoutSet = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}`,
          setNumber: targetSetNum,
          weight: command.weight,
          reps: command.reps,
          unit: command.unit,
          isCompleted: true,
          durationSeconds: currentDuration > 0 ? currentDuration : undefined,
          status: 'completed',
        };

        if (existingIdx >= 0) {
          const ex = updatedExercises[existingIdx];
          updatedExercises[existingIdx] = {
            ...ex,
            sets: [...ex.sets, newSet],
          };
          targetExerciseId = ex.id;
        } else {
          targetExerciseId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ex_${Date.now()}`;
          updatedExercises.push({
            id: targetExerciseId,
            exerciseName: command.exercise,
            sets: [newSet],
          });
        }

        setSaveStatus({
          type: 'success',
          message: `Added Set #${targetSetNum} to ${command.exercise}: ${command.weight} ${command.unit} × ${command.reps} reps`,
        });
      }

      updateWorkout({ ...liveWorkout, exercises: updatedExercises });
      updateSelectedExerciseId(targetExerciseId);
      setShowRestTimer(true);
      playSoundChime();
    },
    [setTimerSeconds, updateWorkout, updateSelectedExerciseId, playSoundChime]
  );

  // Toggle inline timer directly on a set row (Feature: Inline Set Timer)
  const handleToggleInlineTimer = useCallback(
    (exerciseIndex: number, setIndex: number, setId: string, setNumber: number, forceStart?: boolean) => {
      const currentWorkout = activeWorkoutRef.current || activeWorkout;
      if (!currentWorkout) return;
      const targetEx = currentWorkout.exercises[exerciseIndex];
      if (!targetEx) return;

      const currentTimer = activeSetTimersRef.current[setId];
      const isRunning = currentTimer && currentTimer.isRunning;

      if (isRunning && !forceStart) {
        // Stop timer immediately and preserve duration without marking completed
        const timing = completeSetTimer(currentTimer);
        const nextTimers = { ...activeSetTimersRef.current };
        delete nextTimers[setId];
        activeSetTimersRef.current = nextTimers;
        setActiveSetTimers(nextTimers);

        const updatedSets = [...targetEx.sets];
        updatedSets[setIndex] = {
          ...updatedSets[setIndex],
          durationSeconds: timing.durationSeconds,
          startedAt: timing.startedAt,
          completedAt: timing.completedAt,
        };
        const updatedExercises = [...currentWorkout.exercises];
        updatedExercises[exerciseIndex] = { ...targetEx, sets: updatedSets };
        updateWorkout({ ...currentWorkout, exercises: updatedExercises });
        playSoundChime();
        setSaveStatus({
          type: 'info',
          message: `Set #${setNumber} timer stopped: ${timing.formattedDuration}.`,
        });
      } else if (!isRunning) {
        // Start timer immediately
        const newTimer = startSetTimer(targetEx.id, setNumber, setId);
        const nextTimers = { ...activeSetTimersRef.current, [setId]: newTimer };
        activeSetTimersRef.current = nextTimers;
        setActiveSetTimers(nextTimers);
        playSoundChime();
        setSaveStatus({
          type: 'info',
          message: `Timer started for ${targetEx.exerciseName} Set #${setNumber}.`,
        });
      }
    },
    [activeWorkout, updateWorkout, playSoundChime]
  );

  // Undo last logged set
  const handleUndoLast = useCallback(() => {
    if (!activeWorkout || activeWorkout.exercises.length === 0) {
      setSaveStatus({ type: 'info', message: 'No sets to undo.' });
      return;
    }

    const updatedExercises = [...activeWorkout.exercises];
    let removed = false;

    for (let i = updatedExercises.length - 1; i >= 0; i--) {
      const ex = updatedExercises[i];
      if (ex.sets.length > 0) {
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSets = ex.sets.slice(0, -1);
        updatedExercises[i] = { ...ex, sets: newSets };
        removed = true;
        setSaveStatus({
          type: 'info',
          message: `Undid Set #${lastSet.setNumber} on ${ex.exerciseName}.`,
        });
        break;
      }
    }

    if (removed) {
      updateWorkout({ ...activeWorkout, exercises: updatedExercises });
      playSoundChime();
    }
  }, [activeWorkout, updateWorkout, playSoundChime]);

  // Modify last logged set
  const handleModifyLast = useCallback(
    (command: { weight?: number; reps?: number; unit?: WeightUnit }) => {
      if (!activeWorkout || activeWorkout.exercises.length === 0) {
        setSaveStatus({ type: 'info', message: 'No sets to modify.' });
        return;
      }

      const updatedExercises = [...activeWorkout.exercises];
      let modified = false;

      for (let i = updatedExercises.length - 1; i >= 0; i--) {
        const ex = updatedExercises[i];
        if (ex.sets.length > 0) {
          const lastIdx = ex.sets.length - 1;
          const currentSet = ex.sets[lastIdx];
          const newWeight = command.weight !== undefined ? command.weight : currentSet.weight;
          const newReps = command.reps !== undefined ? command.reps : currentSet.reps;
          const newUnit = command.unit !== undefined ? command.unit : currentSet.unit;

          ex.sets[lastIdx] = {
            ...currentSet,
            weight: newWeight,
            reps: newReps,
            unit: newUnit,
          };
          modified = true;
          setSaveStatus({
            type: 'success',
            message: `Updated last set on ${ex.exerciseName}: ${newWeight} ${newUnit} × ${newReps} reps.`,
          });
          break;
        }
      }

      if (modified) {
        updateWorkout({ ...activeWorkout, exercises: updatedExercises });
        playSoundChime();
      }
    },
    [activeWorkout, updateWorkout, playSoundChime]
  );

  // Handle clarification option button click
  const handleClarificationOption = useCallback(
    (option: ClarificationOption) => {
      if (!clarificationState) return;

      if (
        option.action === 'CONFIRM' ||
        option.action === 'SET_VALUE' ||
        option.action === 'CONFIRM_OVERWRITE'
      ) {
        const responseText =
          option.action === 'CONFIRM'
            ? 'yes'
            : typeof option.value === 'string'
            ? option.value
            : String(option.value ?? 'yes');

        const { completedCommand, nextState } = processClarificationResponse(
          clarificationState,
          responseText,
          preferredUnit
        );

        if (completedCommand) {
          const phrase = clarificationState.originalTranscript;
          if ((clarificationState.step === 'CONFIRM_EXERCISE' || clarificationState.suggestedExercise) && phrase) {
            setCustomAliases((prev) => ({
              ...prev,
              [phrase.toLowerCase().trim()]: completedCommand.exercise,
            }));
            saveLearnedAlias(phrase, completedCommand.exercise).catch((err) =>
              console.info('Learned alias save notice:', err)
            );
          }

          setClarificationState(null);
          let currentW = activeWorkoutRef.current || activeWorkout;
          if (!currentW) currentW = handleStartWorkout('Voice Workout');
          executeDirectSetCommand(completedCommand, currentW);
          setSaveStatus({
            type: 'success',
            message: `Confirmed ${completedCommand.exercise}: ${completedCommand.weight} ${completedCommand.unit} × ${completedCommand.reps} reps.`,
          });
        } else if (nextState) {
          setClarificationState(nextState);
          playSoundChime();
          setSaveStatus({ type: 'info', message: nextState.questionPrompt });
        } else {
          setClarificationState(null);
        }
      } else if (option.action === 'CORRECT') {
        if (typeof option.value === 'string' && option.value.trim()) {
          // Exercise replacement selected or typed
          const replacementName = toTitleCase(option.value.trim());
          const completedCmd = {
            type: 'ADD_SET' as const,
            exercise: replacementName,
            weight: clarificationState.weight ?? 0,
            reps: clarificationState.reps ?? 10,
            unit: clarificationState.unit || preferredUnit,
            setNumber: clarificationState.setNumber,
            rawTranscript: clarificationState.originalTranscript,
          };
          const phrase = clarificationState.originalTranscript;
          if (phrase) {
            setCustomAliases((prev) => ({
              ...prev,
              [phrase.toLowerCase().trim()]: replacementName,
            }));
            saveLearnedAlias(phrase, replacementName).catch((err) =>
              console.info('Learned replacement alias save notice:', err)
            );
          }
          setClarificationState(null);
          let currentW = activeWorkoutRef.current || activeWorkout;
          if (!currentW) currentW = handleStartWorkout('Voice Workout');
          executeDirectSetCommand(completedCmd, currentW);
          setSaveStatus({
            type: 'success',
            message: `Logged ${replacementName}: ${completedCmd.weight} ${completedCmd.unit} × ${completedCmd.reps} reps.`,
          });
        } else if (typeof option.value === 'number') {
          // Custom weight entered
          const completedCmd = {
            type: 'ADD_SET' as const,
            exercise: clarificationState.exerciseName || clarificationState.suggestedExercise || 'Exercise',
            weight: option.value,
            reps: clarificationState.reps ?? 10,
            unit: clarificationState.unit || preferredUnit,
            setNumber: clarificationState.setNumber,
            rawTranscript: clarificationState.originalTranscript,
          };
          setClarificationState(null);
          let currentW = activeWorkoutRef.current || activeWorkout;
          if (!currentW) currentW = handleStartWorkout('Voice Workout');
          executeDirectSetCommand(completedCmd, currentW);
          setSaveStatus({
            type: 'success',
            message: `Logged ${completedCmd.exercise}: ${completedCmd.weight} ${completedCmd.unit} × ${completedCmd.reps} reps.`,
          });
        } else {
          setClarificationState(null);
        }
      } else if (option.action === 'REJECT') {
        setShowManualCorrection(true);
        setClarificationState(null);
      } else {
        setClarificationState(null);
      }
    },
    [clarificationState, activeWorkout, preferredUnit, handleStartWorkout, executeDirectSetCommand, playSoundChime]
  );

  // Continuous Voice Command Dispatcher
  const handleVoiceCommand = useCallback(
    (finalTranscript: string) => {
      // Ensure workout exists using synchronous ref
      let currentWorkout = activeWorkoutRef.current || activeWorkout;
      if (!currentWorkout) {
        currentWorkout = handleStartWorkout('Continuous Voice Workout');
      }

      const { exercise: currentEx, lastWeight } = getActiveExerciseContext();

      // Parse structured command with dynamic aliases and pending confirmation context
      const command = parseWorkoutCommand(
        finalTranscript,
        currentEx?.exerciseName,
        lastWeight,
        preferredUnit,
        customAliases,
        pendingConfirmation
      );

      console.log('Voice Command Received:', command);

      // If the incoming command explicitly names an exercise, immediately switch active focus to it
      if ('exercise' in command && command.exercise) {
        const targetExName = command.exercise;
        let currentW = activeWorkoutRef.current || currentWorkout;
        const existingEx = currentW.exercises.find(
          (e) => e.exerciseName.toLowerCase() === targetExName.toLowerCase()
        );
        if (existingEx) {
          if (selectedExerciseIdRef.current !== existingEx.id) {
            updateSelectedExerciseId(existingEx.id);
          }
        } else {
          const newExId =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `ex_${Date.now()}`;
          const newEx: WorkoutExercise = {
            id: newExId,
            exerciseName: targetExName,
            sets: [],
          };
          const updatedW = {
            ...currentW,
            exercises: [...currentW.exercises, newEx],
          };
          updateWorkout(updatedW);
          updateSelectedExerciseId(newExId);
          currentWorkout = updatedW;
        }
      }

      // 1. Process active clarification response if waiting for athlete input
      if (clarificationState) {
        // If clarification was waiting on set number disambiguation (e.g. "Is this set 2 for Bench Press?")
        // and the user repeated the command or spoke the set values:
        if (
          clarificationState.step === 'ASK_SET_NUMBER' &&
          ((command.type === 'ADD_SET' && command.exercise.toLowerCase() === clarificationState.exerciseName?.toLowerCase()) ||
            command.type === 'ADD_SET_CURRENT')
        ) {
          const targetSetNum = clarificationState.setNumber || 2;
          const completedCmd = {
            type: 'ADD_SET' as const,
            exercise: clarificationState.exerciseName || ('exercise' in command ? command.exercise : 'Exercise'),
            weight: ('weight' in command && command.weight !== undefined) ? command.weight : (clarificationState.weight ?? 0),
            reps: ('reps' in command && command.reps !== undefined) ? command.reps : (clarificationState.reps ?? 10),
            unit: ('unit' in command && command.unit) ? command.unit : (clarificationState.unit || preferredUnit),
            setNumber: targetSetNum,
            rawTranscript: finalTranscript,
          };
          setClarificationState(null);
          executeDirectSetCommand(completedCmd, currentWorkout);
          return;
        }

        // If the user speaks an explicit new command or explicit exercise, dismiss stale clarification
        const isExplicitNewAction =
          (command.type === 'ADD_SET' && Boolean(command.exercise)) ||
          command.type === 'SELECT_EXERCISE' ||
          command.type === 'FINISH_WORKOUT' ||
          command.type === 'START_SET' ||
          command.type === 'UNDO_LAST';

        if (isExplicitNewAction) {
          setClarificationState(null);
        } else {
          const { nextState, completedCommand } = processClarificationResponse(
            clarificationState,
            finalTranscript,
            preferredUnit
          );

          if (completedCommand) {
            const phrase = clarificationState.originalTranscript;
            if ((clarificationState.step === 'CONFIRM_EXERCISE' || clarificationState.suggestedExercise) && phrase) {
              setCustomAliases((prev) => ({
                ...prev,
                [phrase.toLowerCase().trim()]: completedCommand.exercise,
              }));
              saveLearnedAlias(phrase, completedCommand.exercise).catch((err) =>
                console.info('Learned alias save notice:', err)
              );
            }
            setClarificationState(null);
            executeDirectSetCommand(completedCommand, currentWorkout);
            return;
          }

          if (nextState) {
            setClarificationState(nextState);
            playSoundChime();
            setSaveStatus({ type: 'info', message: nextState.questionPrompt });
            return;
          }

          setClarificationState(null);
          return;
        }
      }

      // 2. Control Commands
      if (command.type === 'START_SET') {
        const currentW = activeWorkoutRef.current || currentWorkout;
        if (!currentW || currentW.exercises.length === 0) {
          setSaveStatus({
            type: 'info',
            message: 'No exercises in workout. Say an exercise first (e.g. "Bench press 40 kg 10 reps").',
          });
          return;
        }
        const currentSelectedId = selectedExerciseIdRef.current || selectedExerciseId;
        let targetEx =
          currentW.exercises.find((e) => e.id === currentSelectedId) ||
          currentW.exercises[currentW.exercises.length - 1];
        const exIdx = currentW.exercises.findIndex((e) => e.id === targetEx.id);

        let sIdx = targetEx.sets.findIndex((s) => !s.isCompleted);
        if (sIdx === -1 && targetEx.sets.length > 0) {
          sIdx = targetEx.sets.length - 1;
        }

        if (sIdx >= 0 && targetEx.sets[sIdx]) {
          const s = targetEx.sets[sIdx];
          handleToggleInlineTimer(exIdx, sIdx, s.id, s.setNumber, true);
        } else {
          // If exercise has no sets yet, add set 1 and start its timer
          const newSet: WorkoutSet = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}`,
            setNumber: 1,
            weight: 40,
            reps: 10,
            unit: preferredUnit,
            isCompleted: false,
          };
          const updatedEx = { ...targetEx, sets: [newSet] };
          const updatedExercises = [...currentW.exercises];
          updatedExercises[exIdx] = updatedEx;
          updateWorkout({ ...currentW, exercises: updatedExercises });
          handleToggleInlineTimer(exIdx, 0, newSet.id, 1, true);
        }
        return;
      }

      if (command.type === 'UNDO_LAST') {
        handleUndoLast();
        return;
      }

      if (command.type === 'MODIFY_LAST') {
        handleModifyLast(command);
        return;
      }

      // 3. Check for missing fields or repeated exercise disambiguation
      if (
        command.type === 'ADD_SET' ||
        command.type === 'CONFIRM_EXERCISE' ||
        command.type === 'ADD_SET_CURRENT'
      ) {
        const clarificationNeeded = evaluateClarificationNeed({
          rawTranscript: finalTranscript,
          detectedExercise:
            command.type === 'ADD_SET'
              ? command.exercise
              : command.type === 'ADD_SET_CURRENT'
              ? currentEx?.exerciseName
              : undefined,
          detectedUnknownExercise: command.type === 'CONFIRM_EXERCISE' ? command.spokenPhrase : undefined,
          parsedWeight: 'weight' in command ? command.weight : undefined,
          parsedReps: 'reps' in command ? command.reps : undefined,
          parsedSetNumber: 'setNumber' in command ? command.setNumber : undefined,
          unit: 'unit' in command ? command.unit : preferredUnit,
          currentWorkout,
          selectedExerciseId: selectedExerciseIdRef.current || selectedExerciseId,
          preferredUnit,
          customAliases,
        });

        if (clarificationNeeded) {
          setClarificationState(clarificationNeeded);
          playSoundChime();
          setSaveStatus({ type: 'info', message: clarificationNeeded.questionPrompt });
          return;
        }
      }

      switch (command.type) {
        case 'SET_DONE': {
          let currentW = activeWorkoutRef.current || currentWorkout;
          if (!currentW || currentW.exercises.length === 0) break;

          const currentSelectedId = selectedExerciseIdRef.current || selectedExerciseId;
          let targetEx =
            currentW.exercises.find((e) => e.id === currentSelectedId) ||
            currentW.exercises[currentW.exercises.length - 1];
          const exIdx = currentW.exercises.findIndex((e) => e.id === targetEx.id);

          const sets = [...targetEx.sets];
          let updatedAny = false;
          let finishedDuration: number | undefined;

          // Check if any set in this exercise has a running timer
          for (let sIdx = 0; sIdx < sets.length; sIdx++) {
            const s = sets[sIdx];
            const timer = activeSetTimersRef.current[s.id];
            if (timer && timer.isRunning) {
              const timing = completeSetTimer(timer);
              finishedDuration = timing.durationSeconds;
              const nextTimers = { ...activeSetTimersRef.current };
              delete nextTimers[s.id];
              activeSetTimersRef.current = nextTimers;
              setActiveSetTimers(nextTimers);

              sets[sIdx] = {
                ...s,
                isCompleted: true,
                durationSeconds: timing.durationSeconds,
                startedAt: timing.startedAt,
                completedAt: timing.completedAt,
              };
              updatedAny = true;
              break;
            }
          }

          if (!updatedAny && sets.length > 0) {
            let sIdx = sets.findIndex((s) => !s.isCompleted);
            if (sIdx === -1) sIdx = sets.length - 1;
            sets[sIdx] = { ...sets[sIdx], isCompleted: true };
            updatedAny = true;
          }

          if (updatedAny) {
            const updatedExercises = [...currentW.exercises];
            updatedExercises[exIdx] = { ...targetEx, sets };
            updateWorkout({ ...currentW, exercises: updatedExercises });
          }

          setShowRestTimer(true);
          playSoundChime();
          setAmbiguousCommand(null);
          setSaveStatus({
            type: 'success',
            message: finishedDuration
              ? `Set completed in ${formatSetDuration(finishedDuration)}! Rest timer started.`
              : 'Set completed! Rest timer started.',
          });
          break;
        }

        case 'FINISH_WORKOUT': {
          setShowFinishConfirm(true);
          playSoundChime();
          setAmbiguousCommand(null);
          setSaveStatus({
            type: 'info',
            message: 'Voice command: Complete workout. Confirm below to save.',
          });
          break;
        }

        case 'SELECT_EXERCISE': {
          // Switch or create exercise without inventing sets
          const existing = currentWorkout.exercises.find(
            (e) => e.exerciseName.toLowerCase() === command.exercise.toLowerCase()
          );

          if (existing) {
            updateSelectedExerciseId(existing.id);
            setSaveStatus({
              type: 'info',
              message: `Active Exercise: ${existing.exerciseName}`,
            });
          } else {
            const newExId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ex_${Date.now()}`;
            const newEx: WorkoutExercise = {
              id: newExId,
              exerciseName: command.exercise,
              sets: [],
            };
            const updated = {
              ...currentWorkout,
              exercises: [...currentWorkout.exercises, newEx],
            };
            updateWorkout(updated);
            updateSelectedExerciseId(newExId);
            setSaveStatus({
              type: 'info',
              message: `Created & Selected: ${command.exercise} (Speak sets to log)`,
            });
          }
          playSoundChime();
          setAmbiguousCommand(null);
          break;
        }

        case 'ADD_SET': {
          if (command.weight === undefined || command.reps === undefined) {
            setSaveStatus({
              type: 'info',
              message: `Please specify ${command.weight === undefined ? 'weight' : 'reps'} to log this set.`,
            });
            break;
          }

          const liveWorkout = activeWorkoutRef.current || currentWorkout;
          const setWeight = command.weight;
          const setReps = command.reps;

          // Find or create exercise
          const existingIdx = liveWorkout.exercises.findIndex(
            (e) => e.exerciseName.toLowerCase() === command.exercise.toLowerCase()
          );

          let updatedExercises = [...liveWorkout.exercises];
          let targetExerciseId: string;
          const currentDuration = setTimerSeconds;
          setSetTimerSeconds(0);

          // Check if explicit setNumber was provided and already exists (update/correction in place)
          if (
            existingIdx >= 0 &&
            command.setNumber !== undefined &&
            updatedExercises[existingIdx].sets.some((s) => s.setNumber === command.setNumber)
          ) {
            const ex = updatedExercises[existingIdx];
            const updatedSets = ex.sets.map((s) =>
              s.setNumber === command.setNumber
                ? {
                    ...s,
                    weight: setWeight,
                    reps: setReps,
                    unit: command.unit,
                    isCompleted: true,
                    durationSeconds: currentDuration > 0 ? currentDuration : s.durationSeconds,
                  }
                : s
            );
            updatedExercises[existingIdx] = { ...ex, sets: updatedSets };
            targetExerciseId = ex.id;

            setSaveStatus({
              type: 'success',
              message: `Updated Set #${command.setNumber} on ${command.exercise}: ${setWeight} ${command.unit} × ${setReps} reps`,
            });
          } else {
            // Append set(s)
            const targetSetNum =
              command.setNumber !== undefined
                ? command.setNumber
                : existingIdx >= 0
                ? updatedExercises[existingIdx].sets.length + 1
                : 1;

            const newSetsToAdd: WorkoutSet[] = [
              {
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}_0`,
                setNumber: targetSetNum,
                weight: setWeight,
                reps: setReps,
                unit: command.unit,
                isCompleted: true,
                durationSeconds: currentDuration > 0 ? currentDuration : undefined,
              },
            ];

            if (command.additionalSets) {
              command.additionalSets.forEach((as, idx) => {
                newSetsToAdd.push({
                  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}_${idx + 1}`,
                  setNumber: targetSetNum + idx + 1,
                  weight: as.weight,
                  reps: as.reps,
                  unit: as.unit,
                  isCompleted: true,
                });
              });
            }

            if (existingIdx >= 0) {
              const ex = updatedExercises[existingIdx];
              updatedExercises[existingIdx] = {
                ...ex,
                sets: [...ex.sets, ...newSetsToAdd],
              };
              targetExerciseId = ex.id;
            } else {
              targetExerciseId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ex_${Date.now()}`;
              updatedExercises.push({
                id: targetExerciseId,
                exerciseName: command.exercise,
                sets: newSetsToAdd,
              });
            }

            const setsCountLabel = newSetsToAdd.length > 1 ? `${newSetsToAdd.length} sets` : `Set #${targetSetNum}`;
            setSaveStatus({
              type: 'success',
              message: `Added ${setsCountLabel} to ${command.exercise}: ${command.weight} ${command.unit} × ${command.reps} reps`,
            });
          }

          const updated = {
            ...liveWorkout,
            exercises: updatedExercises,
          };
          updateWorkout(updated);
          updateSelectedExerciseId(targetExerciseId);
          setShowRestTimer(true);
          playSoundChime();
          setAmbiguousCommand(null);
          break;
        }

        case 'ADD_SET_CURRENT': {
          if (command.reps === undefined) {
            setSaveStatus({
              type: 'info',
              message: 'Please specify repetitions to log this set.',
            });
            break;
          }

          const liveWorkout = activeWorkoutRef.current || currentWorkout;
          const currentReps = command.reps;

          // Add set to currently selected exercise
          const currentSelectedId = selectedExerciseIdRef.current || selectedExerciseId;
          let targetEx = liveWorkout.exercises.find((e) => e.id === currentSelectedId);
          if (!targetEx && liveWorkout.exercises.length > 0) {
            targetEx = liveWorkout.exercises[liveWorkout.exercises.length - 1];
          }

          if (!targetEx) {
            // No current exercise to attach to
            setAmbiguousCommand({
              type: 'AMBIGUOUS',
              rawTranscript: command.rawTranscript,
              reason: 'No active exercise selected to attach this set to',
              suggestedReps: currentReps,
              suggestedWeight: command.weight,
              suggestedUnit: command.unit,
            });
            return;
          }

          const previousWeight = targetEx.sets.length > 0 ? targetEx.sets[targetEx.sets.length - 1].weight : 40;
          const finalWeight = command.weight !== undefined ? command.weight : previousWeight;
          const currentDuration = setTimerSeconds;
          setSetTimerSeconds(0);
          const targetId = targetEx.id;

          // Check if explicit setNumber was provided and already exists (update/correction in place)
          if (
            command.setNumber !== undefined &&
            targetEx.sets.some((s) => s.setNumber === command.setNumber)
          ) {
            const updatedSets = targetEx.sets.map((s) =>
              s.setNumber === command.setNumber
                ? {
                    ...s,
                    weight: finalWeight,
                    reps: currentReps,
                    unit: command.unit || preferredUnit,
                    isCompleted: true,
                    durationSeconds: currentDuration > 0 ? currentDuration : s.durationSeconds,
                  }
                : s
            );

            const updatedExercises = liveWorkout.exercises.map((e) =>
              e.id === targetId ? { ...e, sets: updatedSets } : e
            );

            const updated = { ...liveWorkout, exercises: updatedExercises };
            updateWorkout(updated);
            updateSelectedExerciseId(targetId);
            setShowRestTimer(true);
            playSoundChime();
            setAmbiguousCommand(null);

            setSaveStatus({
              type: 'success',
              message: `Updated Set #${command.setNumber} on ${targetEx.exerciseName}: ${finalWeight} ${command.unit || preferredUnit} × ${currentReps} reps`,
            });
          } else {
            const targetSetNum =
              command.setNumber !== undefined ? command.setNumber : targetEx.sets.length + 1;

            const newSetsToAdd: WorkoutSet[] = [
              {
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}_0`,
                setNumber: targetSetNum,
                weight: finalWeight,
                reps: currentReps,
                unit: command.unit || preferredUnit,
                isCompleted: true,
                durationSeconds: currentDuration > 0 ? currentDuration : undefined,
              },
            ];

            if (command.setCount && command.setCount > 1) {
              for (let i = 1; i < command.setCount; i++) {
                newSetsToAdd.push({
                  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}_${i}`,
                  setNumber: targetSetNum + i,
                  weight: finalWeight,
                  reps: currentReps,
                  unit: command.unit || preferredUnit,
                  isCompleted: true,
                });
              }
            }

            const updatedExercises = liveWorkout.exercises.map((e) =>
              e.id === targetId ? { ...e, sets: [...e.sets, ...newSetsToAdd] } : e
            );

            const updated = {
              ...liveWorkout,
              exercises: updatedExercises,
            };
            updateWorkout(updated);
            updateSelectedExerciseId(targetId);
            setShowRestTimer(true);
            playSoundChime();
            setAmbiguousCommand(null);

            const setsCountLabel = newSetsToAdd.length > 1 ? `${newSetsToAdd.length} sets` : `Set #${targetSetNum}`;
            setSaveStatus({
              type: 'success',
              message: `Added ${setsCountLabel} to ${targetEx.exerciseName}: ${finalWeight} ${command.unit || preferredUnit} × ${command.reps} reps`,
            });
          }
          break;
        }

        case 'CONFIRM_EXERCISE': {
          setPendingConfirmation(command);
          setShowManualCorrection(false);
          playSoundChime();
          setSaveStatus({
            type: 'info',
            message: `Did you say "${command.suggestedExercise}"? Say 'Yes' or select an option.`,
          });
          break;
        }

        case 'RESOLVE_CONFIRMATION': {
          if (!pendingConfirmation) break;
          if (command.action === 'CONFIRM') {
            const exerciseToLog = command.confirmedExercise || pendingConfirmation.suggestedExercise;
            executeConfirmExercise(exerciseToLog, pendingConfirmation);
          } else if (command.action === 'CORRECT') {
            const exerciseToLog = command.confirmedExercise || 'Exercise';
            executeConfirmExercise(exerciseToLog, pendingConfirmation);
          } else if (command.action === 'REJECT') {
            setShowManualCorrection(true);
            setSaveStatus({
              type: 'info',
              message: 'Suggestion rejected. Choose or speak the correct exercise name below.',
            });
          } else if (command.action === 'DISMISS') {
            setPendingConfirmation(null);
            setShowManualCorrection(false);
            setSaveStatus({
              type: 'info',
              message: 'Exercise confirmation postponed.',
            });
          }
          break;
        }

        case 'AMBIGUOUS': {
          setAmbiguousCommand(command);
          break;
        }
      }
    },
    [
      activeWorkout,
      selectedExerciseId,
      preferredUnit,
      setTimerSeconds,
      customAliases,
      pendingConfirmation,
      clarificationState,
      handleStartWorkout,
      updateWorkout,
      updateSelectedExerciseId,
      getActiveExerciseContext,
      playSoundChime,
      executeConfirmExercise,
      executeDirectSetCommand,
      handleToggleInlineTimer,
      handleUndoLast,
      handleModifyLast,
    ]
  );

  // Initialize Continuous Workout Speech Hook
  const {
    status: speechStatus,
    isListeningActive,
    isListeningDesired,
    interimTranscript,
    lastFinalTranscript,
    errorMessage: speechError,
    startContinuousListening,
    stopContinuousListening,
  } = useContinuousWorkoutSpeech({
    onFinalUtterance: handleVoiceCommand,
  });

  // Toggle Continuous Listening
  const toggleContinuousListening = () => {
    if (isListeningDesired) {
      releaseGymNoiseReduction();
      stopContinuousListening();
      setSaveStatus({ type: 'info', message: 'Continuous listening paused.' });
    } else {
      if (!activeWorkout) {
        handleStartWorkout('Voice Workout');
      }
      prewarmGymNoiseReduction().catch(() => {});
      startContinuousListening();
      setSaveStatus({ type: 'info', message: 'Continuous listening active. Speak anytime.' });
    }
  };

  // Add exercise manually
  const handleAddManualExercise = (exerciseName: string) => {
    const base = activeWorkoutRef.current || activeWorkout || handleStartWorkout('Gym Workout');
    const name = exerciseName.trim() || 'Exercise';
    const newExId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ex_${Date.now()}`;
    const newEx: WorkoutExercise = {
      id: newExId,
      exerciseName: name,
      sets: [
        {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}`,
          setNumber: 1,
          weight: 40,
          reps: 10,
          unit: preferredUnit,
          isCompleted: false,
        },
      ],
    };

    updateWorkout({
      ...base,
      exercises: [...base.exercises, newEx],
    });
    updateSelectedExerciseId(newExId);
    setQuickExerciseInput('');
  };

  // Set management
  const handleAddSet = (exerciseIndex: number) => {
    const currentW = activeWorkoutRef.current || activeWorkout;
    if (!currentW) return;
    const targetEx = currentW.exercises[exerciseIndex];
    if (!targetEx) return;

    const lastSet = targetEx.sets[targetEx.sets.length - 1];
    const newSet: WorkoutSet = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}`,
      setNumber: targetEx.sets.length + 1,
      weight: lastSet ? lastSet.weight : 40,
      reps: lastSet ? lastSet.reps : 10,
      unit: lastSet ? lastSet.unit : preferredUnit,
      isCompleted: false,
    };

    const updatedExercises = [...currentW.exercises];
    updatedExercises[exerciseIndex] = {
      ...targetEx,
      sets: [...targetEx.sets, newSet],
    };

    updateWorkout({ ...currentW, exercises: updatedExercises });
    updateSelectedExerciseId(targetEx.id);
  };

  const handleUpdateSet = (
    exerciseIndex: number,
    setIndex: number,
    updates: Partial<WorkoutSet>
  ) => {
    const currentW = activeWorkoutRef.current || activeWorkout;
    if (!currentW) return;
    const targetEx = currentW.exercises[exerciseIndex];
    if (!targetEx) return;

    const updatedSets = [...targetEx.sets];
    updatedSets[setIndex] = { ...updatedSets[setIndex], ...updates };

    const updatedExercises = [...currentW.exercises];
    updatedExercises[exerciseIndex] = { ...targetEx, sets: updatedSets };

    updateWorkout({ ...currentW, exercises: updatedExercises });
  };

  const handleDeleteSet = (exerciseIndex: number, setIndex: number) => {
    const currentW = activeWorkoutRef.current || activeWorkout;
    if (!currentW) return;
    const targetEx = currentW.exercises[exerciseIndex];
    if (!targetEx) return;

    const setDeleted = targetEx.sets[setIndex];
    if (setDeleted) {
      const nextTimers = { ...activeSetTimersRef.current };
      delete nextTimers[setDeleted.id];
      activeSetTimersRef.current = nextTimers;
      setActiveSetTimers(nextTimers);
    }

    const updatedSets = targetEx.sets
      .filter((_, idx) => idx !== setIndex)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));

    const updatedExercises = [...currentW.exercises];
    updatedExercises[exerciseIndex] = { ...targetEx, sets: updatedSets };

    updateWorkout({ ...currentW, exercises: updatedExercises });
  };

  const handleDeleteExercise = (exerciseIndex: number) => {
    const currentW = activeWorkoutRef.current || activeWorkout;
    if (!currentW) return;
    const targetEx = currentW.exercises[exerciseIndex];
    if (targetEx) {
      const nextTimers = { ...activeSetTimersRef.current };
      targetEx.sets.forEach((s) => delete nextTimers[s.id]);
      activeSetTimersRef.current = nextTimers;
      setActiveSetTimers(nextTimers);
    }

    const updatedExercises = currentW.exercises.filter((_, idx) => idx !== exerciseIndex);
    updateWorkout({ ...currentW, exercises: updatedExercises });
    if (selectedExerciseIdRef.current === targetEx?.id || selectedExerciseId === targetEx?.id) {
      updateSelectedExerciseId(updatedExercises.length > 0 ? updatedExercises[0].id : null);
    }
  };

  // Finish and save workout to Supabase or local storage
  const handleFinishWorkout = async () => {
    const currentWorkout = activeWorkoutRef.current || activeWorkout;
    if (!currentWorkout) return;

    // Turn off continuous listening on workout finish
    stopContinuousListening();

    setIsSaving(true);
    setSaveStatus(null);

    const workoutToSave: Workout = {
      ...currentWorkout,
      completedAt: new Date().toISOString(),
      notes: workoutNotes.trim() || undefined,
    };

    const result = await saveFinishedWorkout(workoutToSave);

    setIsSaving(false);

    if (result.success) {
      setShowFinishConfirm(false);
      updateWorkout(null);
      updateSelectedExerciseId(null);
      setActiveSetTimers({});
      activeSetTimersRef.current = {};
      setWorkoutNotes('');
      setElapsedSeconds(0);
      setSetTimerSeconds(0);
      refreshRecommendations(preferredUnit);
      setSaveStatus({
        type: 'success',
        message:
          result.persistedTo === 'supabase'
            ? 'Workout successfully saved and synced to Supabase!'
            : 'Workout successfully saved locally on this device.',
      });
    } else {
      setSaveStatus({
        type: 'error',
        message: result.error || 'Failed to save workout. Sign in or save locally.',
      });
    }
  };

  // Save workout locally on device (Guest mode / Offline)
  const handleSaveLocally = () => {
    const currentWorkout = activeWorkoutRef.current || activeWorkout;
    if (!currentWorkout) return;

    stopContinuousListening();

    const workoutToSave: Workout = {
      ...currentWorkout,
      completedAt: new Date().toISOString(),
      notes: workoutNotes.trim() || undefined,
    };

    const result = saveWorkoutLocally(workoutToSave);
    setShowFinishConfirm(false);

    if (result.success) {
      updateWorkout(null);
      updateSelectedExerciseId(null);
      setActiveSetTimers({});
      activeSetTimersRef.current = {};
      setWorkoutNotes('');
      setElapsedSeconds(0);
      setSetTimerSeconds(0);
      refreshRecommendations(preferredUnit);
      setSaveStatus({
        type: 'info',
        message: 'Workout saved to local storage on this device.',
      });
    } else {
      setSaveStatus({
        type: 'error',
        message: result.error || 'Failed to save workout locally.',
      });
    }
  };

  // Discard workout
  const handleDiscardWorkout = () => {
    if (confirm('Discard this workout? Unsaved progress will be lost.')) {
      stopContinuousListening();
      updateWorkout(null);
      updateSelectedExerciseId(null);
      setActiveSetTimers({});
      activeSetTimersRef.current = {};
      setWorkoutNotes('');
      setElapsedSeconds(0);
      setSetTimerSeconds(0);
      setSaveStatus(null);
    }
  };

  // Status Badge Label & Color
  const getStatusDisplay = (st: ContinuousSpeechStatus) => {
    switch (st) {
      case 'listening':
        return { label: 'Listening Continuously', color: 'bg-lime-500/20 text-lime-400 border-lime-500/40' };
      case 'processing':
        return { label: 'Processing Speech...', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'reconnecting':
        return { label: 'Reconnecting Mic...', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse' };
      case 'error':
        return { label: 'Microphone Error', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      case 'unsupported':
        return { label: 'Speech API Unsupported', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
      default:
        return { label: 'Speech Idle', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }
  };

  const statusBadge = getStatusDisplay(speechStatus);
  const activeExContext = getActiveExerciseContext();

  const totalVolume = activeWorkout
    ? activeWorkout.exercises.reduce((sum, ex) => {
        return (
          sum +
          ex.sets.reduce((sSum, s) => {
            return s.isCompleted ? sSum + s.weight * s.reps : sSum;
          }, 0)
        );
      }, 0)
    : 0;

  const totalSetsCount = activeWorkout
    ? activeWorkout.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.isCompleted).length, 0)
    : 0;

  return (
    <div className="space-y-4 pb-6">
      {/* Toast Notification Banner */}
      {saveStatus && (
        <div
          className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-semibold animate-in fade-in ${
            saveStatus.type === 'success'
              ? 'bg-lime-950/90 border border-lime-500/50 text-lime-300'
              : saveStatus.type === 'error'
              ? 'bg-rose-950/90 border border-rose-500/50 text-rose-300'
              : 'bg-zinc-900 border border-zinc-700 text-zinc-200'
          }`}
        >
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-lime-400 shrink-0 mt-0.5" />
          ) : saveStatus.type === 'error' ? (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="h-4 w-4 text-lime-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p>{saveStatus.message}</p>
          </div>
          <button
            onClick={() => setSaveStatus(null)}
            className="text-zinc-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* VIEW A: NO ACTIVE WORKOUT -> DASHBOARD */}
      {!activeWorkout && (
        <div className="space-y-6 pt-2">
          {/* Athlete Header */}
          <div className="flex items-center justify-between p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-lime-400 block mb-0.5">
                ATHLETE SESSION
              </span>
              <h2 className="text-xl font-black text-white tracking-tight">
                {userEmail ? userEmail.split('@')[0] : 'Gym Tracker'}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-zinc-400 block">Unit</span>
              <span className="text-xs font-bold text-lime-400 uppercase">{preferredUnit}</span>
            </div>
          </div>

          {/* Primary Action Card: Continuous Voice Start */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-lime-400/30 text-center shadow-[0_0_30px_rgba(163,230,53,0.1)] space-y-4">
            <button
              onClick={toggleContinuousListening}
              className="w-20 h-20 rounded-3xl bg-lime-400/10 border-2 border-lime-400/40 text-lime-400 mx-auto flex items-center justify-center shadow-[0_0_25px_rgba(163,230,53,0.3)] hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <Mic className="h-10 w-10 text-lime-400 animate-pulse" />
            </button>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Continuous Voice Tracking
              </h1>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                Turn on the mic once and leave it running. Speak exercises and sets anytime during your workout without tapping again.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={toggleContinuousListening}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-lime-400 to-lime-300 hover:from-lime-300 hover:to-lime-200 text-black font-black text-base flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(163,230,53,0.35)] active:scale-95 transition cursor-pointer"
              >
                <Radio className="h-5 w-5 text-black" />
                <span>START CONTINUOUS LISTENING</span>
              </button>

              <button
                onClick={() => {
                  handleStartWorkout('Full Body Workout');
                  if (!isListeningDesired) {
                    prewarmGymNoiseReduction().catch(() => {});
                    startContinuousListening();
                  }
                }}
                className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Play className="h-4 w-4" />
                <span>Start Empty Workout</span>
              </button>
            </div>
          </div>

          {/* Daily Recommendation Section ("Your workout for today") */}
          {dailyRecommendation && !isRecommendationDismissed && (
            <DailyRecommendationCard
              recommendation={dailyRecommendation}
              workouts={workoutHistory}
              preferredUnit={preferredUnit}
              onAcceptWorkout={handleAcceptRecommendation}
              onDismiss={() => setIsRecommendationDismissed(true)}
              onOverrideRestDay={() => {
                const todayKey = getLocalDateKey(new Date());
                const overrideRec = generateDailyRecommendation([], todayKey, preferredUnit);
                setDailyRecommendation({
                  ...overrideRec,
                  title: 'Optional Active Session',
                  subtitle: 'Light training session override',
                  explanation: 'Athlete requested workout override on scheduled rest day.',
                  isRestDay: false,
                });
              }}
            />
          )}

          {/* Quick Workout Splits */}
          <div className="space-y-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 px-1">
              Quick Workout Splits
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { name: 'Push Day', desc: 'Chest, Shoulders, Triceps' },
                { name: 'Pull Day', desc: 'Back, Biceps, Rear Delts' },
                { name: 'Legs & Core', desc: 'Quads, Hamstrings, Calves' },
                { name: 'Upper Power', desc: 'Heavy Compound Presses' },
              ].map((split) => (
                <button
                  key={split.name}
                  onClick={() => {
                    handleStartWorkout(split.name);
                    if (!isListeningDesired) {
                      prewarmGymNoiseReduction().catch(() => {});
                      startContinuousListening();
                    }
                  }}
                  className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-lime-400/50 text-left transition group active:scale-95 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white group-hover:text-lime-400 transition">
                      {split.name}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-lime-400" />
                  </div>
                  <span className="text-[10px] text-zinc-400 block truncate">
                    {split.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Repeat Last Workout */}
          {lastWorkout && (
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-lime-400" />
                  Last Workout: {lastWorkout.title}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {new Date(lastWorkout.startedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {lastWorkout.exercises.length} exercises • {lastWorkout.exercises.map((e) => e.exerciseName).join(', ')}
              </p>
              <button
                onClick={() => {
                  const clonedExercises: WorkoutExercise[] = lastWorkout.exercises.map((ex) => ({
                    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ex_${Date.now()}_${Math.random()}`,
                    exerciseName: ex.exerciseName,
                    sets: ex.sets.map((s, idx) => ({
                      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}_${idx}`,
                      setNumber: idx + 1,
                      weight: s.weight,
                      reps: s.reps,
                      unit: s.unit || preferredUnit,
                      isCompleted: false,
                    })),
                  }));

                  const newW = {
                    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `w_${Date.now()}`,
                    title: lastWorkout.title,
                    startedAt: new Date().toISOString(),
                    exercises: clonedExercises,
                  };
                  updateWorkout(newW);
                  if (clonedExercises.length > 0) updateSelectedExerciseId(clonedExercises[0].id);
                }}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-lime-400 text-xs font-bold border border-zinc-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Repeat This Workout
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW B: ACTIVE WORKOUT IN PROGRESS */}
      {activeWorkout && (
        <div className="space-y-4">
          {/* Header Bar */}
          <div className="sticky top-14 z-30 -mx-4 px-4 py-3 bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between">
            <div className="flex-1 mr-2">
              <input
                type="text"
                value={activeWorkout.title}
                onChange={(e) => updateWorkout({ ...activeWorkout, title: e.target.value })}
                className="font-black text-lg text-white bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-lime-400 focus:outline-none w-full"
                placeholder="Workout Name"
              />
              <div className="flex items-center gap-2.5 text-xs text-zinc-400 mt-0.5">
                <span className="font-mono font-bold text-lime-400 flex items-center gap-1" title="Workout Duration (continuous)">
                  <span className="inline-block w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                  {formatDuration(elapsedSeconds)}
                </span>
                <span>•</span>
                <span className="font-mono font-bold text-amber-300 flex items-center gap-1" title="Active Set Duration (Say 'Set done' to finish)">
                  <Timer className="h-3 w-3 text-amber-400" />
                  Set: {formatDuration(setTimerSeconds)}
                </span>
                <span>•</span>
                <span>{totalSetsCount} sets</span>
                <span>•</span>
                <span>{totalVolume} {preferredUnit}</span>
              </div>
            </div>

            {/* Rest Timer & Finish */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRestTimer(!showRestTimer)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  showRestTimer
                    ? 'bg-lime-400 text-black border-lime-400'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                }`}
                title="Toggle Rest Timer"
              >
                <Timer className="h-4 w-4" />
              </button>

              <button
                onClick={() => setShowFinishConfirm(true)}
                className="px-3.5 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(163,230,53,0.3)] active:scale-95 transition cursor-pointer"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Finish</span>
              </button>
            </div>
          </div>

          {/* Rest Timer Drawer if Open */}
          {showRestTimer && (
            <RestTimer onClose={() => setShowRestTimer(false)} />
          )}

          {/* PERSISTENT WORKOUT LISTENING CONTROL CARD */}
          <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              {/* Single Continuous Control Button */}
              <button
                onClick={toggleContinuousListening}
                className={`py-2.5 px-4 rounded-2xl font-black text-xs flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-lg ${
                  isListeningDesired
                    ? 'bg-rose-950/80 border border-rose-500/60 text-rose-300 hover:bg-rose-900/80'
                    : 'bg-lime-400 hover:bg-lime-300 text-black shadow-lime-400/20'
                }`}
              >
                {isListeningDesired ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    <span>STOP LISTENING</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    <span>START LISTENING</span>
                  </>
                )}
              </button>

              {/* Status Indicator Badge */}
              <div className={`px-2.5 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1.5 ${statusBadge.color}`}>
                <span
                  className={`w-2 h-2 rounded-full ${
                    speechStatus === 'listening'
                      ? 'bg-lime-400 animate-ping'
                      : speechStatus === 'processing'
                      ? 'bg-amber-400 animate-pulse'
                      : speechStatus === 'reconnecting'
                      ? 'bg-blue-400 animate-pulse'
                      : 'bg-zinc-500'
                  }`}
                />
                <span>{statusBadge.label}</span>
              </div>
            </div>

            {/* Error Message if Any */}
            {speechError && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {speechError}
              </div>
            )}

            {/* Currently Focused Exercise Badge */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-850 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-extrabold text-zinc-500">Active Focus:</span>
                {activeExContext.exercise ? (
                  <span className="font-extrabold text-white flex items-center gap-1 text-lime-400">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {activeExContext.exercise.exerciseName}
                    {activeExContext.lastWeight > 0 && (
                      <span className="text-zinc-400 font-normal ml-1">
                        (Last: {activeExContext.lastWeight} {preferredUnit})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-zinc-500 italic">None (Say an exercise name to select)</span>
                )}
              </div>
              <span className="text-[10px] text-zinc-500">“same weight, 8 reps” attaches here</span>
            </div>

            {/* Real-time speech stream */}
            {!isListeningDesired ? (
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <MicOff className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Microphone is paused. Tap <strong>START LISTENING</strong> to log sets by voice.</span>
                </div>
                <button
                  type="button"
                  onClick={toggleContinuousListening}
                  className="px-3 py-1.5 rounded-xl bg-lime-400 text-black font-black text-xs hover:bg-lime-300 transition cursor-pointer shrink-0 ml-2 shadow-[0_0_10px_rgba(163,230,53,0.3)]"
                >
                  Turn On
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850/80">
                <p className="text-xs text-zinc-300 font-mono">
                  {interimTranscript ? (
                    <span>
                      Hearing: <span className="text-lime-400 font-bold">“{interimTranscript}”</span>
                    </span>
                  ) : lastFinalTranscript ? (
                    <span className="text-zinc-400">
                      Heard: <span className="text-zinc-200">“{lastFinalTranscript}”</span>
                    </span>
                  ) : (
                    <span className="text-zinc-500 italic">
                      Mic open... Speak exercises or sets anytime (e.g. “Bench press 60 kg 10 reps”)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* EXERCISE CONFIRMATION CARD (When exercise is unknown or needs confirmation) */}
            {pendingConfirmation && (
              <div className="p-4 rounded-3xl bg-zinc-900 border-2 border-lime-400 shadow-[0_0_30px_rgba(163,230,53,0.15)] space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-lime-400 uppercase tracking-wider">
                      <HelpCircle className="h-4 w-4 text-lime-400 animate-pulse" />
                      <span>Confirm Exercise</span>
                    </div>
                    <h3 className="text-xl font-black text-white">
                      Did you say <span className="text-lime-400 underline decoration-lime-400/50">{pendingConfirmation.suggestedExercise}</span>?
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Heard: <span className="text-zinc-200 italic">“{pendingConfirmation.spokenPhrase}”</span>
                      {pendingConfirmation.weight !== undefined && (
                        <span className="ml-1 text-zinc-300 font-mono">
                          • {pendingConfirmation.weight} {pendingConfirmation.unit} × {pendingConfirmation.reps} reps
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-lime-400/10 text-lime-400 border border-lime-400/30">
                    Say “Yes” or “No”
                  </span>
                </div>

                {!showManualCorrection ? (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => executeConfirmExercise(pendingConfirmation.suggestedExercise, pendingConfirmation)}
                      className="py-2.5 px-3 rounded-2xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(163,230,53,0.3)] active:scale-95 transition cursor-pointer"
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>Yes, log it</span>
                    </button>

                    <button
                      onClick={() => setShowManualCorrection(true)}
                      className="py-2.5 px-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1 border border-zinc-700 active:scale-95 transition cursor-pointer"
                    >
                      <span>Choose another</span>
                    </button>

                    <button
                      onClick={() => {
                        setPendingConfirmation(null);
                        setSaveStatus({ type: 'info', message: 'Exercise confirmation postponed.' });
                      }}
                      className="py-2.5 px-3 rounded-2xl bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 font-bold text-xs flex items-center justify-center border border-zinc-800 active:scale-95 transition cursor-pointer"
                    >
                      <span>Not now</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={correctionInput}
                        onChange={(e) => setCorrectionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && correctionInput.trim()) {
                            executeConfirmExercise(correctionInput.trim(), pendingConfirmation);
                          }
                        }}
                        placeholder="Type or speak correct exercise name..."
                        className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white focus:outline-none focus:border-lime-400"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (correctionInput.trim()) {
                            executeConfirmExercise(correctionInput.trim(), pendingConfirmation);
                          }
                        }}
                        disabled={!correctionInput.trim()}
                        className="px-4 py-2 rounded-xl bg-lime-400 disabled:opacity-40 text-black font-black text-xs hover:bg-lime-300 transition cursor-pointer"
                      >
                        Save &amp; Log
                      </button>
                      <button
                        onClick={() => setShowManualCorrection(false)}
                        className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 cursor-pointer"
                      >
                        Back
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['Bench Press', 'Incline Bench Press', 'Chest Flyes', 'Dumbbell Row', 'Shoulder Press', 'Lat Pulldown', 'Squat'].map((quick) => (
                        <button
                          key={quick}
                          onClick={() => executeConfirmExercise(quick, pendingConfirmation)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-850 hover:bg-lime-400/20 hover:text-lime-400 text-[11px] text-zinc-300 border border-zinc-750 transition cursor-pointer"
                        >
                          {quick}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ambiguous Utterance Confirmation Pill */}
            {ambiguousCommand && (
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2 animate-in fade-in">
                <div className="flex items-start justify-between text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold">
                    <HelpCircle className="h-4 w-4 text-amber-400" />
                    <span>Uncertain Voice Input:</span>
                    <span className="italic">“{ambiguousCommand.rawTranscript}”</span>
                  </div>
                  <button
                    onClick={() => setAmbiguousCommand(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">{ambiguousCommand.reason}</p>

                {/* 1-Tap Confirmation Buttons */}
                {ambiguousCommand.suggestedReps && activeExContext.exercise && (
                  <button
                    onClick={() => {
                      handleVoiceCommand(
                        `${activeExContext.exercise?.exerciseName} ${ambiguousCommand.suggestedWeight || activeExContext.lastWeight || 40} kg ${ambiguousCommand.suggestedReps} reps`
                      );
                    }}
                    className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition"
                  >
                    Log as {ambiguousCommand.suggestedReps} reps for {activeExContext.exercise.exerciseName}?
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Manual Add Input Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={quickExerciseInput}
              onChange={(e) => setQuickExerciseInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddManualExercise(quickExerciseInput);
              }}
              placeholder="Or type exercise name: e.g. Seated Row"
              className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-400"
            />
            <button
              onClick={() => handleAddManualExercise(quickExerciseInput)}
              disabled={!quickExerciseInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 disabled:opacity-40 text-xs font-bold text-lime-400 hover:bg-zinc-700 transition cursor-pointer"
            >
              Add
            </button>
          </div>

          {/* Quick Exercise Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {COMMON_EXERCISES.slice(0, 8).map((name) => (
              <button
                key={name}
                onClick={() => handleAddManualExercise(name)}
                className="shrink-0 text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 px-2.5 py-1 rounded-full transition cursor-pointer"
              >
                + {name}
              </button>
            ))}
          </div>

          {/* Empty State when no exercises added yet */}
          {activeWorkout.exercises.length === 0 && (
            <div className="py-12 text-center rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3 px-4">
              <div className="w-12 h-12 rounded-full bg-zinc-800/80 text-zinc-400 mx-auto flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-lime-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-white">Workout is currently empty</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                  Start listening and say your exercises and sets:
                  <span className="text-lime-400 font-bold block mt-1">
                    “Bench press, 40 kilos, 10 reps”
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Exercises List under workout section */}
          <div className="space-y-4">
            {activeWorkout.exercises.map((exercise, exIndex) => {
              const isCurrentlySelected = exercise.id === selectedExerciseId;

              return (
                <div
                  key={exercise.id}
                  onClick={() => setSelectedExerciseId(exercise.id)}
                  className={`rounded-3xl border p-4 space-y-3 shadow-lg transition cursor-pointer ${
                    isCurrentlySelected
                      ? 'bg-zinc-900/95 border-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.15)] ring-1 ring-lime-400/30'
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Exercise Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={exercise.exerciseName}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const updated = [...activeWorkout.exercises];
                          updated[exIndex] = { ...exercise, exerciseName: e.target.value };
                          updateWorkout({ ...activeWorkout, exercises: updated });
                        }}
                        className="font-extrabold text-base text-white bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-lime-400 focus:outline-none w-full"
                      />
                      {isCurrentlySelected && (
                        <span className="px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                          Active Focus
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteExercise(exIndex)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
                        title="Delete Exercise"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sets Table */}
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    {exercise.sets.map((set, setIndex) => {
                      const currentTimer = activeSetTimers[set.id];
                      const isTimerRunning = Boolean(currentTimer && currentTimer.isRunning);
                      const liveElapsed = isTimerRunning && currentTimer
                        ? Math.max(0, Math.floor((Date.now() - new Date(currentTimer.startedAt).getTime()) / 1000))
                        : set.durationSeconds || 0;
                      const displayDuration = formatDuration(liveElapsed);

                      return (
                        <div
                          key={set.id}
                          className={`p-2.5 rounded-2xl border transition space-y-2 ${
                            set.isCompleted
                              ? 'bg-lime-950/20 border-lime-500/30 text-white'
                              : 'bg-zinc-950/70 border-zinc-800/80 text-zinc-300'
                          }`}
                        >
                          {/* Top row: Set #, Weight, Reps, Done check, Delete */}
                          <div className="flex items-center justify-between gap-1">
                            {/* Set Number */}
                            <div className="flex items-center gap-1 min-w-[28px]">
                              <span className="font-extrabold text-xs text-zinc-400">#{set.setNumber}</span>
                            </div>

                            {/* Weight Stepper / Input */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSet(exIndex, setIndex, {
                                    weight: Math.max(0, parseFloat((set.weight - 2.5).toFixed(1))),
                                  })
                                }
                                className="w-5 h-5 rounded bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs hover:bg-zinc-700 cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                step="0.5"
                                value={set.weight}
                                onChange={(e) =>
                                  handleUpdateSet(exIndex, setIndex, {
                                    weight: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-11 bg-transparent text-center font-bold text-sm text-white focus:outline-none"
                              />
                              <span className="text-[10px] text-zinc-500">{preferredUnit}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSet(exIndex, setIndex, {
                                    weight: parseFloat((set.weight + 2.5).toFixed(1)),
                                  })
                                }
                                className="w-5 h-5 rounded bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs hover:bg-zinc-700 cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            {/* Reps Stepper / Input */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSet(exIndex, setIndex, {
                                    reps: Math.max(1, set.reps - 1),
                                  })
                                }
                                className="w-5 h-5 rounded bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs hover:bg-zinc-700 cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={set.reps}
                                onChange={(e) =>
                                  handleUpdateSet(exIndex, setIndex, {
                                    reps: parseInt(e.target.value, 10) || 0,
                                  })
                                }
                                className="w-8 bg-transparent text-center font-bold text-sm text-white focus:outline-none"
                              />
                              <span className="text-[10px] text-zinc-500">reps</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSet(exIndex, setIndex, {
                                    reps: set.reps + 1,
                                  })
                                }
                                className="w-5 h-5 rounded bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs hover:bg-zinc-700 cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            {/* Checkmark & Delete */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newCompleted = !set.isCompleted;
                                  handleUpdateSet(exIndex, setIndex, { isCompleted: newCompleted });
                                  if (newCompleted) setShowRestTimer(true);
                                }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer ${
                                  set.isCompleted
                                    ? 'bg-lime-400 text-black shadow-[0_0_10px_rgba(163,230,53,0.4)]'
                                    : 'bg-zinc-800 text-zinc-500 hover:text-white'
                                }`}
                                title={set.isCompleted ? 'Mark incomplete' : 'Mark done'}
                              >
                                <Check className="h-4 w-4 stroke-[3]" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSet(exIndex, setIndex)}
                                className="text-zinc-600 hover:text-rose-400 p-1 cursor-pointer"
                                title="Delete set"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Inline Set Timer Control (Button + Elapsed Duration) */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800/60 text-xs">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleInlineTimer(exIndex, setIndex, set.id, set.setNumber)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                  isTimerRunning
                                    ? 'bg-amber-500 text-black animate-pulse hover:bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                    : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80'
                                }`}
                              >
                                <Timer className="h-3.5 w-3.5" />
                                <span>{isTimerRunning ? 'Stop Timer' : 'Start Timer'}</span>
                              </button>
                              <span className={`font-mono text-xs font-bold ${isTimerRunning ? 'text-amber-300 animate-pulse' : 'text-zinc-400'}`}>
                                {displayDuration}
                              </span>
                            </div>
                            {set.durationSeconds && !isTimerRunning ? (
                              <span className="text-[10px] text-zinc-500">Recorded</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Set Action Button */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleAddSet(exIndex)}
                      className="w-full py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-xs font-bold text-zinc-300 flex items-center justify-center gap-1.5 transition cursor-pointer border border-zinc-750"
                    >
                      <Plus className="h-3.5 w-3.5 text-lime-400" />
                      <span>Add Set</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Discard Workout Button */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleDiscardWorkout}
              className="text-xs text-rose-400/80 hover:text-rose-400 font-semibold transition cursor-pointer"
            >
              Discard this workout
            </button>
          </div>
        </div>
      )}

      {/* Finish Workout Confirmation Modal */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-lime-400">
                WORKOUT COMPLETED
              </span>
              <h3 className="text-xl font-black text-white">Save Workout</h3>
              <p className="text-xs text-zinc-400">
                {activeWorkout?.title} • {formatDuration(elapsedSeconds)} • {totalVolume} {preferredUnit} moved
              </p>
            </div>

            {/* Cloud Sync vs Guest Status */}
            {userEmail ? (
              <div className="p-3 rounded-2xl bg-lime-950/40 border border-lime-800/60 flex items-center gap-2.5 text-xs text-lime-300">
                <ShieldCheck className="h-4 w-4 text-lime-400 shrink-0" />
                <div className="flex-1 truncate">
                  <span className="font-bold">Syncing to Supabase PostgreSQL:</span>
                  <p className="text-zinc-400 text-[11px] truncate">{userEmail}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/60 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-amber-300">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Guest Mode (Local Storage Only)</span>
                    <p className="text-zinc-300 text-[11px] mt-0.5">
                      Supabase PostgreSQL requires an athlete login. Sign in now to sync this workout to your Supabase Table Editor.
                    </p>
                  </div>
                </div>
                <div className="pt-1">
                  <Link
                    href="/auth"
                    className="w-full py-2 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Sign In to Sync to Cloud</span>
                  </Link>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Workout Notes (optional):
              </label>
              <textarea
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                placeholder="Felt strong, good pump, increased bench weight..."
                rows={3}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-400"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowFinishConfirm(false)}
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition cursor-pointer"
              >
                Keep Going
              </button>

              {userEmail ? (
                <button
                  onClick={handleFinishWorkout}
                  disabled={isSaving}
                  className="flex-2 w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-black font-black text-sm flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(163,230,53,0.3)] transition cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save & Sync</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSaveLocally}
                  disabled={isSaving}
                  className="flex-2 w-full py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Saves in browser local storage only"
                >
                  <Save className="h-4 w-4 text-amber-400" />
                  <span>Save Locally</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voice Clarification Multi-Turn Modal (Feature 1 & 2) */}
      {clarificationState && (
        <VoiceClarificationModal
          clarification={clarificationState}
          onSelectOption={handleClarificationOption}
          onDismiss={() => setClarificationState(null)}
        />
      )}

      {/* Persistent Bottom Nav */}
      <BottomNav hasActiveWorkout={Boolean(activeWorkout)} />
    </div>
  );
}
