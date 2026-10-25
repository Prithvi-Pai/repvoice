export type WeightUnit = 'kg' | 'lbs';

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  unit: WeightUnit;
  isCompleted: boolean;
  rpe?: number;
  durationSeconds?: number;
}

export interface WorkoutExercise {
  id: string;
  exerciseName: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  title: string;
  startedAt: string;
  completedAt?: string;
  notes?: string;
  exercises: WorkoutExercise[];
}

export interface ParsedSet {
  weight: number;
  reps: number;
  unit: WeightUnit;
}

export interface ParsedVoiceEntry {
  exercise: string;
  sets: ParsedSet[];
  rawTranscript: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface PendingExerciseConfirmation {
  spokenPhrase: string;
  suggestedExercise: string;
  weight?: number;
  reps?: number;
  unit: WeightUnit;
  setNumber?: number;
  setCount?: number;
  additionalSets?: ParsedSet[];
  rawTranscript: string;
  isSelectionOnly?: boolean;
}

export interface CanonicalExercise {
  id?: string;
  userId?: string;
  canonicalName: string;
  category?: string;
}

export interface ExerciseAliasRecord {
  id?: string;
  exerciseId?: string;
  userId?: string;
  aliasText: string;
  canonicalName: string;
}

export type WorkoutVoiceCommand =
  | {
      type: 'ADD_SET';
      exercise: string;
      weight: number;
      reps: number;
      unit: WeightUnit;
      setNumber?: number;
      setCount?: number;
      additionalSets?: ParsedSet[];
      rawTranscript: string;
    }
  | {
      type: 'ADD_SET_CURRENT';
      weight?: number;
      reps: number;
      unit: WeightUnit;
      setNumber?: number;
      setCount?: number;
      rawTranscript: string;
    }
  | {
      type: 'SELECT_EXERCISE';
      exercise: string;
      rawTranscript: string;
    }
  | {
      type: 'SET_DONE';
      rawTranscript: string;
    }
  | {
      type: 'FINISH_WORKOUT';
      rawTranscript: string;
    }
  | {
      type: 'CONFIRM_EXERCISE';
      spokenPhrase: string;
      suggestedExercise: string;
      weight?: number;
      reps?: number;
      unit: WeightUnit;
      setNumber?: number;
      setCount?: number;
      additionalSets?: ParsedSet[];
      rawTranscript: string;
      isSelectionOnly?: boolean;
    }
  | {
      type: 'RESOLVE_CONFIRMATION';
      action: 'CONFIRM' | 'CORRECT' | 'REJECT' | 'DISMISS';
      spokenPhrase?: string;
      confirmedExercise?: string;
      rawTranscript: string;
    }
  | {
      type: 'AMBIGUOUS';
      rawTranscript: string;
      reason: string;
      suggestedExercise?: string;
      suggestedWeight?: number;
      suggestedReps?: number;
      suggestedUnit?: WeightUnit;
      suggestedSetNumber?: number;
    };

export interface UserProfile {
  id: string;
  email?: string;
  displayName?: string;
  preferredUnit: WeightUnit;
}

export interface SaveWorkoutResult {
  success: boolean;
  error?: string;
  persistedTo: 'supabase' | 'local_fallback';
}
