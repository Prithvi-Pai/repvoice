/**
 * Intelligent Clarification State Machine for RepVoice
 * Manages multi-turn voice dialogs, missing field prompts, repeated exercise disambiguation,
 * duplicate prevention, and user corrections (e.g. "No, shoulder press", "I meant 35 kg", "Undo").
 */

import {
  WeightUnit,
  ClarificationState,
  ClarificationOption,
  Workout,
  WorkoutExercise,
} from '../../types';
import { toTitleCase } from '../exercises/exerciseStore';
import { resolveMultilingualPhrase } from './multilingualNormalizer';

export interface ParseCandidateInput {
  rawTranscript: string;
  detectedExercise?: string;
  detectedUnknownExercise?: string;
  parsedWeight?: number;
  parsedReps?: number;
  parsedSetNumber?: number;
  unit?: WeightUnit;
  isSameWeight?: boolean;
  isNextSet?: boolean;
  currentWorkout: Workout | null;
  selectedExerciseId: string | null;
  preferredUnit: WeightUnit;
  customAliases?: Record<string, string>;
}

/**
 * Evaluates whether an incoming utterance requires clarification or can be resolved immediately.
 */
export function evaluateClarificationNeed(input: ParseCandidateInput): ClarificationState | null {
  const {
    rawTranscript,
    detectedExercise,
    detectedUnknownExercise,
    parsedWeight,
    parsedReps,
    parsedSetNumber,
    unit = input.preferredUnit,
    isSameWeight,
    isNextSet,
    currentWorkout,
    selectedExerciseId,
    customAliases = {},
  } = input;

  // Check multilingual resolution if not already matched
  let resolvedExercise = detectedExercise;
  if (!resolvedExercise && detectedUnknownExercise) {
    const multiMatch = resolveMultilingualPhrase(detectedUnknownExercise, customAliases);
    if (multiMatch) {
      resolvedExercise = multiMatch;
    }
  }

  // Find active exercise in current workout session
  let activeEx: WorkoutExercise | undefined;
  if (currentWorkout) {
    if (selectedExerciseId) {
      activeEx = currentWorkout.exercises.find((e) => e.id === selectedExerciseId);
    }
    if (!activeEx && currentWorkout.exercises.length > 0) {
      activeEx = currentWorkout.exercises[currentWorkout.exercises.length - 1];
    }
  }

  const targetExerciseName = resolvedExercise || activeEx?.exerciseName;

  // 1. Unrecognized exercise candidate detected -> Ask: "Did you say Chest Press?"
  if (!resolvedExercise && detectedUnknownExercise) {
    const candidateName = toTitleCase(detectedUnknownExercise);
    return {
      step: 'CONFIRM_EXERCISE',
      suggestedExercise: candidateName,
      weight: parsedWeight,
      reps: parsedReps,
      setNumber: parsedSetNumber,
      unit,
      originalTranscript: rawTranscript,
      questionPrompt: `Did you say ${candidateName}?`,
      options: [
        { label: 'Yes, log it', action: 'CONFIRM', value: candidateName },
        { label: 'Choose another exercise', action: 'REJECT' },
        { label: 'Not now', action: 'DISMISS' },
      ],
    };
  }

  // 2. Check for Repeated Exercise disambiguation (Feature 2)
  if (resolvedExercise && currentWorkout) {
    const existingSameNameEx = currentWorkout.exercises.find(
      (e) => e.exerciseName.toLowerCase() === resolvedExercise.toLowerCase()
    );

    if (existingSameNameEx && existingSameNameEx.sets.length > 0) {
      const nextInferredSet = existingSameNameEx.sets.length + 1;
      const targetSetNum = parsedSetNumber || nextInferredSet;

      // If user says an exercise that is already logged and didn't explicitly say "set X"
      if (!parsedSetNumber && !isNextSet) {
        return {
          step: 'ASK_SET_NUMBER',
          exerciseName: existingSameNameEx.exerciseName,
          targetExerciseId: existingSameNameEx.id,
          setNumber: nextInferredSet,
          weight: parsedWeight,
          reps: parsedReps,
          unit,
          originalTranscript: rawTranscript,
          questionPrompt: `You already logged ${existingSameNameEx.exerciseName}. Is this set ${nextInferredSet}?`,
          options: [
            { label: `Yes, Set ${nextInferredSet}`, action: 'CONFIRM', value: nextInferredSet },
            { label: 'Specify another set', action: 'CORRECT' },
            { label: 'Cancel', action: 'DISMISS' },
          ],
        };
      }

      // If user specifies a set number that ALREADY EXISTS, ask before overwriting!
      const setAlreadyExists = existingSameNameEx.sets.find((s) => s.setNumber === targetSetNum);
      if (setAlreadyExists && parsedSetNumber) {
        return {
          step: 'CONFIRM_OVERWRITE',
          exerciseName: existingSameNameEx.exerciseName,
          targetExerciseId: existingSameNameEx.id,
          setNumber: targetSetNum,
          existingSetToOverwrite: targetSetNum,
          weight: parsedWeight,
          reps: parsedReps,
          unit,
          originalTranscript: rawTranscript,
          questionPrompt: `Set ${targetSetNum} already exists (${setAlreadyExists.weight} ${setAlreadyExists.unit} × ${setAlreadyExists.reps} reps). Do you want to update it?`,
          options: [
            { label: `Update Set ${targetSetNum}`, action: 'CONFIRM_OVERWRITE', value: targetSetNum },
            { label: `Add as Set ${nextInferredSet}`, action: 'SET_VALUE', value: nextInferredSet },
            { label: 'Cancel', action: 'DISMISS' },
          ],
        };
      }
    }
  }

  // 3. Missing repetitions: We know the exercise and weight, but reps is absent
  if (targetExerciseName && parsedWeight !== undefined && parsedReps === undefined) {
    return {
      step: 'ASK_REPS',
      exerciseName: targetExerciseName,
      weight: parsedWeight,
      setNumber: parsedSetNumber,
      unit,
      originalTranscript: rawTranscript,
      questionPrompt: `How many reps did you complete on ${targetExerciseName}?`,
      options: [
        { label: '8 reps', action: 'SET_VALUE', value: 8 },
        { label: '10 reps', action: 'SET_VALUE', value: 10 },
        { label: '12 reps', action: 'SET_VALUE', value: 12 },
        { label: 'Other', action: 'CORRECT' },
      ],
    };
  }

  // 4. Missing weight: We know exercise and reps, but weight is absent
  if (targetExerciseName && parsedReps !== undefined && parsedWeight === undefined && !isSameWeight) {
    return {
      step: 'ASK_WEIGHT',
      exerciseName: targetExerciseName,
      reps: parsedReps,
      setNumber: parsedSetNumber,
      unit,
      originalTranscript: rawTranscript,
      questionPrompt: `What weight did you use for ${parsedReps} reps on ${targetExerciseName}?`,
      options: [
        { label: `Bodyweight (0 ${unit})`, action: 'SET_VALUE', value: 0 },
        { label: `20 ${unit}`, action: 'SET_VALUE', value: 20 },
        { label: `40 ${unit}`, action: 'SET_VALUE', value: 40 },
        { label: 'Say another weight', action: 'CORRECT' },
      ],
    };
  }

  // 5. Missing both repetitions and weight on a set command
  if (targetExerciseName && parsedWeight === undefined && parsedReps === undefined && !isSameWeight) {
    return {
      step: 'ASK_REPS',
      exerciseName: targetExerciseName,
      setNumber: parsedSetNumber,
      unit,
      originalTranscript: rawTranscript,
      questionPrompt: `How many reps did you complete on ${targetExerciseName}?`,
      options: [
        { label: '8 reps', action: 'SET_VALUE', value: 8 },
        { label: '10 reps', action: 'SET_VALUE', value: 10 },
        { label: '12 reps', action: 'SET_VALUE', value: 12 },
        { label: 'Other', action: 'CORRECT' },
      ],
    };
  }

  return null;
}

/**
 * Handles conversational voice responses during an active clarification session.
 * Supports: "Yes", "No", numbers, corrections ("I meant 35 kilos", "No, bench press").
 */
export function processClarificationResponse(
  currentClarification: ClarificationState,
  responseText: string,
  preferredUnit: WeightUnit
): { nextState: ClarificationState | null; completedCommand?: any } {
  const text = responseText.toLowerCase().trim();

  // 1. Dismiss / Cancel intent
  if (/\b(?:not now|cancel|stop|never mind|dismiss|leave it)\b/i.test(text)) {
    return { nextState: null };
  }

  // 2. Affirmative responses ("Yes", "Yeah", "Correct", "Save it", "Log it", "Right", or the suggested candidate name)
  const isAffirmative =
    /^(?:yes|yeah|yep|yup|correct|sure|right|confirm|save it|log it|ok|okay)\b/i.test(text) ||
    (Boolean(currentClarification.suggestedExercise) &&
      text === currentClarification.suggestedExercise!.toLowerCase().trim());

  if (isAffirmative) {
    if (currentClarification.step === 'CONFIRM_EXERCISE') {
      const exercise = currentClarification.suggestedExercise || 'Exercise';

      // Check if reps or weight are still needed
      if (currentClarification.reps === undefined) {
        return {
          nextState: {
            ...currentClarification,
            step: 'ASK_REPS',
            exerciseName: exercise,
            questionPrompt: `Got it, ${exercise}. How many reps did you complete?`,
            options: [
              { label: '8 reps', action: 'SET_VALUE', value: 8 },
              { label: '10 reps', action: 'SET_VALUE', value: 10 },
              { label: '12 reps', action: 'SET_VALUE', value: 12 },
            ],
          },
        };
      }

      if (currentClarification.weight === undefined) {
        return {
          nextState: {
            ...currentClarification,
            step: 'ASK_WEIGHT',
            exerciseName: exercise,
            questionPrompt: `What weight did you use for ${currentClarification.reps} reps?`,
            options: [
              { label: `Bodyweight`, action: 'SET_VALUE', value: 0 },
              { label: `20 ${preferredUnit}`, action: 'SET_VALUE', value: 20 },
              { label: `40 ${preferredUnit}`, action: 'SET_VALUE', value: 40 },
              { label: 'Say another weight', action: 'CORRECT' },
            ],
          },
        };
      }

      // All fields present! Return complete command
      return {
        nextState: null,
        completedCommand: {
          type: 'ADD_SET',
          exercise,
          weight: currentClarification.weight,
          reps: currentClarification.reps,
          unit: currentClarification.unit || preferredUnit,
          setNumber: currentClarification.setNumber,
          rawTranscript: currentClarification.originalTranscript,
        },
      };
    }

    if (currentClarification.step === 'ASK_SET_NUMBER') {
      // Confirmed set number
      return {
        nextState: null,
        completedCommand: {
          type: 'ADD_SET',
          exercise: currentClarification.exerciseName,
          weight: currentClarification.weight ?? 0,
          reps: currentClarification.reps ?? 10,
          unit: currentClarification.unit || preferredUnit,
          setNumber: currentClarification.setNumber,
          rawTranscript: currentClarification.originalTranscript,
        },
      };
    }

    if (currentClarification.step === 'CONFIRM_OVERWRITE') {
      return {
        nextState: null,
        completedCommand: {
          type: 'ADD_SET',
          exercise: currentClarification.exerciseName,
          weight: currentClarification.weight ?? 0,
          reps: currentClarification.reps ?? 10,
          unit: currentClarification.unit || preferredUnit,
          setNumber: currentClarification.existingSetToOverwrite,
          rawTranscript: currentClarification.originalTranscript,
          isOverwrite: true,
        },
      };
    }
  }

  // 3. User provides a number (e.g. "12 reps", "40 kg", "Set 2")
  const numberMatch = text.match(/\b\d+(\.\d+)?\b/);
  if (numberMatch) {
    const num = parseFloat(numberMatch[0]);

    if (currentClarification.step === 'ASK_REPS') {
      const reps = Math.round(num);
      if (currentClarification.weight === undefined) {
        return {
          nextState: {
            ...currentClarification,
            reps,
            step: 'ASK_WEIGHT',
            questionPrompt: `Got ${reps} reps. What weight did you use?`,
            options: [
              { label: 'Bodyweight', action: 'SET_VALUE', value: 0 },
              { label: `20 ${preferredUnit}`, action: 'SET_VALUE', value: 20 },
              { label: `40 ${preferredUnit}`, action: 'SET_VALUE', value: 40 },
            ],
          },
        };
      }

      return {
        nextState: null,
        completedCommand: {
          type: 'ADD_SET',
          exercise: currentClarification.exerciseName,
          weight: currentClarification.weight,
          reps,
          unit: currentClarification.unit || preferredUnit,
          setNumber: currentClarification.setNumber,
          rawTranscript: currentClarification.originalTranscript,
        },
      };
    }

    if (currentClarification.step === 'ASK_WEIGHT') {
      return {
        nextState: null,
        completedCommand: {
          type: 'ADD_SET',
          exercise: currentClarification.exerciseName || currentClarification.suggestedExercise || 'Exercise',
          weight: num,
          reps: currentClarification.reps ?? 10,
          unit: currentClarification.unit || preferredUnit,
          setNumber: currentClarification.setNumber,
          rawTranscript: currentClarification.originalTranscript,
        },
      };
    }

    if (currentClarification.step === 'ASK_SET_NUMBER') {
      return {
        nextState: null,
        completedCommand: {
          type: 'ADD_SET',
          exercise: currentClarification.exerciseName,
          weight: currentClarification.weight ?? 0,
          reps: currentClarification.reps ?? 10,
          unit: currentClarification.unit || preferredUnit,
          setNumber: Math.round(num),
          rawTranscript: currentClarification.originalTranscript,
        },
      };
    }
  }

  // 4. User corrects an exercise name (e.g. "No, Shoulder Press" or "I meant Incline Bench")
  const correctionMatch = text.match(/(?:no\s*,?\s*|i meant\s+|change to\s+)(.+)/i);
  if (correctionMatch) {
    const correctedName = toTitleCase(correctionMatch[1].trim());
    return {
      nextState: null,
      completedCommand: {
        type: 'ADD_SET',
        exercise: correctedName,
        weight: currentClarification.weight ?? 0,
        reps: currentClarification.reps ?? 10,
        unit: currentClarification.unit || preferredUnit,
        setNumber: currentClarification.setNumber,
        rawTranscript: responseText,
      },
    };
  }

  return { nextState: null };
}
