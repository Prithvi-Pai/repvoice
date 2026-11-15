export type WeightUnit = 'kg' | 'lbs';

export type SetStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  unit: WeightUnit;
  isCompleted: boolean;
  rpe?: number;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  status?: SetStatus;
  isVoiceLogged?: boolean;
}

export type ClarificationStep =
  | 'IDLE'
  | 'CONFIRM_EXERCISE'
  | 'ASK_SET_NUMBER'
  | 'ASK_REPS'
  | 'ASK_WEIGHT'
  | 'CONFIRM_OVERWRITE'
  | 'FINAL_CONFIRMATION';

export interface ClarificationOption {
  label: string;
  action: 'CONFIRM' | 'CORRECT' | 'REJECT' | 'DISMISS' | 'SET_VALUE' | 'CONFIRM_OVERWRITE';
  value?: any;
}

export interface ClarificationState {
  step: ClarificationStep;
  exerciseName?: string;
  suggestedExercise?: string;
  setNumber?: number;
  reps?: number;
  weight?: number;
  unit: WeightUnit;
  targetExerciseId?: string;
  existingSetToOverwrite?: number;
  originalTranscript: string;
  questionPrompt: string;
  options: ClarificationOption[];
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
  durationSeconds?: number;
  avgRestSeconds?: number;
  caloriesBurned?: number;
  totalVolume?: number;
  totalSets?: number;
  voiceSetsCount?: number;
  snapshotUrl?: string;
  snapshotLocation?: string;
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
      weight?: number;
      reps?: number;
      unit: WeightUnit;
      setNumber?: number;
      setCount?: number;
      additionalSets?: ParsedSet[];
      rawTranscript: string;
    }
  | {
      type: 'ADD_SET_CURRENT';
      weight?: number;
      reps?: number;
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
      type: 'START_SET';
      exercise?: string;
      rawTranscript: string;
    }
  | {
      type: 'UNDO_LAST';
      rawTranscript: string;
    }
  | {
      type: 'MODIFY_LAST';
      weight?: number;
      reps?: number;
      unit?: WeightUnit;
      exercise?: string;
      rawTranscript: string;
    }
  | {
      type: 'CLARIFICATION_ANSWER';
      action: 'YES' | 'NO' | 'SET_NUMBER' | 'SET_REPS' | 'SET_WEIGHT' | 'CORRECTION' | 'DISMISS';
      value?: any;
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
  recognitionMode?: 'continuous' | 'push_to_talk';
  spokenConfirmations?: boolean;
  beepOnRecord?: boolean;
  microphoneSensitivity?: 'quiet' | 'standard' | 'aggressive';
  defaultRestTimerSeconds?: number;
  avatarUrl?: string;
  tier?: 'free' | 'pro' | 'ultra';
}

// --- Stitch Workout Plan Models (Screen 4: /plan) ---
export interface PlanExercise {
  id: string;
  planId?: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  targetWeight?: number;
  unit: WeightUnit;
  restSeconds: number;
  orderIndex: number;
}

export interface WorkoutPlan {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  scheduledDay: string;       // e.g. "Tomorrow, Oct 25", "Saturday, Oct 27"
  scheduledDate?: string;
  isActive: boolean;
  orderIndex: number;
  exercises: PlanExercise[];
  createdAt?: string;
  updatedAt?: string;
}

// --- Stitch Personal Record Models (Screens 1, 3, 5) ---
export interface PersonalRecord {
  id: string;
  userId?: string;
  exerciseName: string;
  recordType: 'max_weight' | 'max_reps' | 'max_volume';
  recordValue: number;
  unit: WeightUnit;
  reps?: number;
  workoutId?: string;
  achievedAt: string;
  previousValue?: number;
  delta?: number;             // e.g. +10 lbs
}

// --- Stitch Previous Performance Comparison (Screen 2: active_workout) ---
export interface PreviousSetPerformance {
  setNumber: number;
  weight: number;
  reps: number;
  unit: WeightUnit;
  formatted: string;          // e.g. "185 × 8"
}

export interface ExercisePerformanceHistory {
  exerciseName: string;
  lastWorkoutDate: string;
  sets: PreviousSetPerformance[];
}

// --- Stitch Dashboard & Review Telemetry (Screens 1 & 3) ---
export interface HomeDashboardMetrics {
  streakDays: number;
  weeklyVolume: number;
  weeklyVolumeFormatted: string; // e.g. "24.1k"
  totalWorkoutsCount: number;
  preferredUnit: WeightUnit;
  todayFocus: string;            // e.g. "Push Day • Upper Body"
  recentWorkout?: {
    id: string;
    title: string;
    completedAt: string;
    durationMinutes: number;
    volume: number;
    setsCount: number;
    prDelta?: string;            // e.g. "PR +5 lbs"
    voiceAccuracyPercent: number;// e.g. 100
  };
}

export interface WorkoutReviewMetrics {
  durationSeconds: number;
  formattedDuration: string;     // e.g. "48m 22s"
  avgRestSeconds: number;        // e.g. 64s avg
  totalVolume: number;           // e.g. 14,820 lbs
  totalSets: number;             // e.g. 16 Sets
  exerciseCount: number;         // e.g. 4 Key movements
  voiceSetsCount: number;        // e.g. 14
  voiceSyncPercent: number;      // e.g. 88%
  newPRs: PersonalRecord[];      // e.g. ["205 lbs (+10 lbs)", "30 lbs × 12 reps"]
  snapshotUrl?: string;
  snapshotLocation?: string;     // e.g. "Power Rack #3"
}

export interface SaveWorkoutResult {
  success: boolean;
  error?: string;
  persistedTo: 'supabase' | 'local_fallback';
}

export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full_body';

export interface ExerciseVariation {
  name: string;
  muscleGroup: MuscleGroup;
  reason: string;
}

export interface RecommendedExerciseItem {
  id: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  targetSets: number;
  targetReps: number;
  targetWeight?: number;
  unit: WeightUnit;
  explanation: string;
  progressionNote?: string;
  variations: ExerciseVariation[];
}

export interface DailyWorkoutRecommendation {
  type: 'workout' | 'rest';
  title: string;
  subtitle: string;
  primaryMuscleGroup: string;
  explanation: string;
  isPersonalized: boolean;
  isRestDay: boolean;
  exercises: RecommendedExerciseItem[];
  generatedForDate: string;
}
