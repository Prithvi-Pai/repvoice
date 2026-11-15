/**
 * RepVoice Previous Performance Lookup Service (Screen 2: active_workout)
 * Resolves prior weight × rep benchmarks for the "Prev" column of active exercise tables.
 * Powers arm's-length legibility and in-set progression benchmarking.
 */

import { Workout, PreviousSetPerformance } from '@/types';

/**
 * Searches historical workouts for the most recent session containing the given exercise.
 * Returns an array of previous sets formatted as e.g. "185 × 8".
 */
export function getPreviousPerformanceForExercise(
  exerciseName: string,
  history: Workout[]
): PreviousSetPerformance[] {
  if (!exerciseName || !history || history.length === 0) return [];

  const targetName = exerciseName.toLowerCase().trim();

  // Sort history descending by completed date
  const sorted = [...history].sort(
    (a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime()
  );

  for (const workout of sorted) {
    const match = workout.exercises.find(
      (e) => e.exerciseName.toLowerCase().trim() === targetName
    );

    if (match && match.sets && match.sets.length > 0) {
      // Found the latest workout with this exercise
      const completedSets = match.sets.filter((s) => s.isCompleted);
      const setsToFormat = completedSets.length > 0 ? completedSets : match.sets;

      return setsToFormat.map((s, idx) => ({
        setNumber: s.setNumber || idx + 1,
        weight: s.weight,
        reps: s.reps,
        unit: s.unit || 'lbs',
        formatted: `${s.weight} × ${s.reps}`,
      }));
    }
  }

  return [];
}

/**
 * Pre-computes previous performance benchmarks for every exercise in history in a single O(N) pass.
 * Returns a lookup map: { [exerciseNameLower]: PreviousSetPerformance[] }
 */
export function getPreviousExerciseMap(
  history: Workout[]
): Record<string, PreviousSetPerformance[]> {
  const map: Record<string, PreviousSetPerformance[]> = {};
  if (!history || history.length === 0) return map;

  const sorted = [...history].sort(
    (a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime()
  );

  for (const workout of sorted) {
    for (const ex of workout.exercises) {
      const key = ex.exerciseName.toLowerCase().trim();
      if (!map[key] && ex.sets && ex.sets.length > 0) {
        const completedSets = ex.sets.filter((s) => s.isCompleted);
        const setsToFormat = completedSets.length > 0 ? completedSets : ex.sets;

        map[key] = setsToFormat.map((s, idx) => ({
          setNumber: s.setNumber || idx + 1,
          weight: s.weight,
          reps: s.reps,
          unit: s.unit || 'lbs',
          formatted: `${s.weight} × ${s.reps}`,
        }));
      }
    }
  }

  return map;
}
