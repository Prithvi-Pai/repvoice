import { MuscleGroup, Workout, WorkoutExercise } from '@/types';
import { getExerciseMuscleGroup } from '../recommendation/recommendationEngine';
import { getSupabaseClient } from '../supabase/client';

export const LOCAL_STORAGE_CUSTOM_MUSCLES_KEY = 'repvoice_custom_exercise_muscles';

export const MUSCLE_GROUPS_LIST: MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'full_body',
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  full_body: 'Full Body',
};

/**
 * Retrieves user-learned muscle group mappings from localStorage.
 */
export function getCustomExerciseMuscles(): Record<string, MuscleGroup> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_MUSCLES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Persists a user's manual muscle group classification for a custom exercise.
 * Remembers it so the user is never asked again for this exercise.
 */
export async function saveCustomExerciseMuscle(
  exerciseName: string,
  muscleGroup: MuscleGroup
): Promise<void> {
  const norm = exerciseName.toLowerCase().trim();
  if (!norm) return;

  // 1. Save to localStorage
  if (typeof window !== 'undefined') {
    try {
      const current = getCustomExerciseMuscles();
      current[norm] = muscleGroup;
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_MUSCLES_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to save custom muscle group locally:', e);
    }
  }

  // 2. Optionally sync to Supabase exercises table
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        await client
          .from('exercises')
          .update({ category: MUSCLE_GROUP_LABELS[muscleGroup] })
          .eq('user_id', user.id)
          .ilike('canonical_name', norm);
      }
    } catch {
      // Non-blocking
    }
  }
}

/**
 * Removes a custom exercise muscle group classification.
 */
export function deleteCustomExerciseMuscle(exerciseName: string): void {
  const norm = exerciseName.toLowerCase().trim();
  if (!norm || typeof window === 'undefined') return;
  try {
    const current = getCustomExerciseMuscles();
    delete current[norm];
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_MUSCLES_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to delete custom muscle group locally:', e);
  }
}

/**
 * Checks whether an exercise's muscle group is known (either in catalogue or learned from user).
 * Returns isKnown = false if this is an unrecognized custom name needing athlete input.
 */
export function identifyExerciseMuscleGroup(
  exerciseName: string,
  customMap?: Record<string, MuscleGroup>
): { muscleGroup: MuscleGroup; isKnown: boolean } {
  if (!exerciseName) return { muscleGroup: 'full_body', isKnown: true };

  const norm = exerciseName.toLowerCase().trim();
  const customs = customMap || getCustomExerciseMuscles();

  // 1. User-custom learned mapping takes precedence
  if (customs[norm]) {
    return { muscleGroup: customs[norm], isKnown: true };
  }

  // Check substring in customs
  for (const [key, group] of Object.entries(customs)) {
    if (norm.includes(key) || key.includes(norm)) {
      return { muscleGroup: group, isKnown: true };
    }
  }

  // 2. Standard catalogue lookup
  const detected = getExerciseMuscleGroup(norm);

  // If detected is full_body, check if it's genuinely known as full body (e.g. burpees, clean and jerk)
  const knownFullBody = [
    'burpee',
    'burpees',
    'clean and jerk',
    'snatch',
    'kettlebell swing',
    'thruster',
    'thrusters',
    'farmers walk',
    'sled push',
    'battle ropes',
    'full body',
  ];

  if (detected === 'full_body') {
    const isGenuinelyFullBody = knownFullBody.some((k) => norm.includes(k));
    if (isGenuinelyFullBody) {
      return { muscleGroup: 'full_body', isKnown: true };
    }
    // Unrecognized custom name! Needs clarification from user
    return { muscleGroup: 'full_body', isKnown: false };
  }

  return { muscleGroup: detected, isKnown: true };
}

/**
 * Formats a clean human-readable summary of muscle groups trained in a workout.
 * E.g., "Chest, Shoulders & Triceps" or "Legs & Core"
 */
export function getWorkoutMuscleGroupsSummary(
  workout: Workout,
  customMap?: Record<string, MuscleGroup>
): string {
  // If user explicitly provided or edited a description, use it directly
  if (workout.muscleGroupDescription?.trim()) {
    return workout.muscleGroupDescription.trim();
  }

  if (!workout.exercises || workout.exercises.length === 0) {
    return 'Full Body Conditioning';
  }

  const customs = customMap || getCustomExerciseMuscles();
  const groupsSeen: MuscleGroup[] = [];

  for (const ex of workout.exercises) {
    const { muscleGroup } = identifyExerciseMuscleGroup(ex.exerciseName, customs);
    if (!groupsSeen.includes(muscleGroup)) {
      groupsSeen.push(muscleGroup);
    }
  }

  if (groupsSeen.length === 0) return 'General Training';
  if (groupsSeen.length === 1) return MUSCLE_GROUP_LABELS[groupsSeen[0]];
  if (groupsSeen.length >= 4 || groupsSeen.includes('full_body')) return 'Full Body';

  const labels = groupsSeen.map((g) => MUSCLE_GROUP_LABELS[g]);
  if (labels.length === 2) {
    return `${labels[0]} & ${labels[1]}`;
  }

  const last = labels.pop();
  return `${labels.join(', ')} & ${last}`;
}
