import { Workout, WorkoutExercise, WorkoutSet, UserProfile, SaveWorkoutResult } from '@/types';
import { getSupabaseClient } from './supabase/client';

const LOCAL_STORAGE_ACTIVE_WORKOUT = 'repvoice_active_workout';
const LOCAL_STORAGE_HISTORY = 'repvoice_history';
const LOCAL_STORAGE_PROFILE = 'repvoice_profile';

const DEFAULT_PROFILE: UserProfile = {
  id: 'guest_user',
  displayName: 'Gym Athlete',
  preferredUnit: 'kg',
};

// Profile storage
export function getStoredProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROFILE);
    return raw ? JSON.parse(raw) : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveStoredProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_PROFILE, JSON.stringify(profile));
}

// Active in-progress workout
export function getActiveWorkout(): Workout | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACTIVE_WORKOUT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveWorkout(workout: Workout | null): void {
  if (typeof window === 'undefined') return;
  if (!workout) {
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_WORKOUT);
  } else {
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_WORKOUT, JSON.stringify(workout));
  }
}

// Workout History
export async function getWorkoutHistory(): Promise<{ workouts: Workout[]; source: 'supabase' | 'local'; error?: string }> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data: { user }, error: authErr } = await client.auth.getUser();
      if (authErr) throw authErr;

      if (user) {
        const { data, error } = await client
          .from('workouts')
          .select(`
            id,
            title,
            started_at,
            completed_at,
            notes,
            workout_exercises (
              id,
              exercise_name,
              order_index,
              workout_sets (
                id,
                set_number,
                weight,
                reps,
                unit,
                is_completed,
                rpe
              )
            )
          `)
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('started_at', { ascending: false });

        if (error) {
          console.error('Supabase getWorkoutHistory error:', error);
          throw error;
        }

        if (data) {
          const formatted: Workout[] = data.map((w: any) => {
            const sortedExercises = (w.workout_exercises || []).sort(
              (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
            );

            return {
              id: w.id,
              title: w.title,
              startedAt: w.started_at,
              completedAt: w.completed_at,
              notes: w.notes,
              exercises: sortedExercises.map((we: any) => {
                const sortedSets = (we.workout_sets || []).sort(
                  (a: any, b: any) => (a.set_number ?? 0) - (b.set_number ?? 0)
                );
                return {
                  id: we.id,
                  exerciseName: we.exercise_name,
                  sets: sortedSets.map((ws: any) => ({
                    id: ws.id,
                    setNumber: ws.set_number,
                    weight: Number(ws.weight),
                    reps: Number(ws.reps),
                    unit: ws.unit,
                    isCompleted: ws.is_completed,
                    rpe: ws.rpe ? Number(ws.rpe) : undefined,
                  })),
                };
              }),
            };
          });

          return { workouts: formatted, source: 'supabase' };
        }
      }
    } catch (e: any) {
      console.warn('Supabase fetch failed, checking local backup:', e);
      const localHistory = getLocalWorkoutHistory();
      return {
        workouts: localHistory,
        source: 'local',
        error: e?.message || 'Failed to query Supabase PostgreSQL. Check schema and tables.',
      };
    }
  }

  // Fallback to local storage if not configured or unauthenticated
  const localHistory = getLocalWorkoutHistory();
  return { workouts: localHistory, source: 'local' };
}

function getLocalWorkoutHistory(): Workout[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveFinishedWorkout(workout: Workout): Promise<SaveWorkoutResult> {
  const finishedWorkout: Workout = {
    ...workout,
    completedAt: workout.completedAt || new Date().toISOString(),
  };

  const client = getSupabaseClient();

  // If Supabase is connected and user is logged in, persist to Supabase
  if (client) {
    try {
      const { data: { user }, error: userErr } = await client.auth.getUser();
      if (userErr) throw userErr;

      if (!user) {
        throw new Error('You must be signed in to sync workouts with Supabase PostgreSQL.');
      }

      // 1. Insert workout row
      const { data: workoutRow, error: wError } = await client
        .from('workouts')
        .insert({
          user_id: user.id,
          title: finishedWorkout.title || 'Workout Session',
          notes: finishedWorkout.notes || null,
          started_at: finishedWorkout.startedAt,
          completed_at: finishedWorkout.completedAt,
        })
        .select()
        .single();

      if (wError) throw new Error(`Workout insert failed: ${wError.message}`);

      // 2. Insert exercises and sets
      for (let i = 0; i < finishedWorkout.exercises.length; i++) {
        const ex = finishedWorkout.exercises[i];
        const { data: exRow, error: exError } = await client
          .from('workout_exercises')
          .insert({
            workout_id: workoutRow.id,
            exercise_name: ex.exerciseName || 'Exercise',
            order_index: i,
          })
          .select()
          .single();

        if (exError) throw new Error(`Exercise insert failed: ${exError.message}`);

        if (ex.sets.length > 0) {
          const setRows = ex.sets.map((s, idx) => ({
            workout_exercise_id: exRow.id,
            set_number: s.setNumber || idx + 1,
            weight: Number(s.weight) || 0,
            reps: Number(s.reps) || 0,
            unit: s.unit || 'kg',
            is_completed: s.isCompleted ?? true,
            rpe: s.rpe ?? null,
          }));

          const { error: setsError } = await client
            .from('workout_sets')
            .insert(setRows);

          if (setsError) throw new Error(`Sets insert failed: ${setsError.message}`);
        }
      }

      // Remove from active workout
      saveActiveWorkout(null);

      // Keep local backup as well
      try {
        const local = getLocalWorkoutHistory();
        const updated = [{ ...finishedWorkout, id: workoutRow.id }, ...local.filter((w) => w.id !== workout.id)];
        localStorage.setItem(LOCAL_STORAGE_HISTORY, JSON.stringify(updated));
      } catch {
        // ignore
      }

      return {
        success: true,
        persistedTo: 'supabase',
      };
    } catch (e: any) {
      console.error('Supabase save error:', e);
      // Save to local storage as fallback so athlete never loses workout data
      try {
        const local = getLocalWorkoutHistory();
        const updated = [finishedWorkout, ...local.filter((w) => w.id !== workout.id)];
        localStorage.setItem(LOCAL_STORAGE_HISTORY, JSON.stringify(updated));
        saveActiveWorkout(null);
      } catch {
        // ignore
      }

      return {
        success: false,
        error: e?.message || 'Database error while saving workout to Supabase.',
        persistedTo: 'local_fallback',
      };
    }
  }

  // If Supabase is not configured, save locally
  try {
    const local = getLocalWorkoutHistory();
    const updated = [finishedWorkout, ...local.filter((w) => w.id !== workout.id)];
    localStorage.setItem(LOCAL_STORAGE_HISTORY, JSON.stringify(updated));
    saveActiveWorkout(null);
    return {
      success: true,
      persistedTo: 'local_fallback',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to save workout to local storage.',
      persistedTo: 'local_fallback',
    };
  }
}

export async function deleteWorkoutFromHistory(workoutId: string): Promise<boolean> {
  const client = getSupabaseClient();
  let deletedFromSupabase = false;

  if (client) {
    try {
      const { error } = await client.from('workouts').delete().eq('id', workoutId);
      if (!error) deletedFromSupabase = true;
    } catch (e) {
      console.error('Failed to delete workout from Supabase:', e);
    }
  }

  // Also remove from local storage
  if (typeof window !== 'undefined') {
    const local = getLocalWorkoutHistory();
    const updated = local.filter((w) => w.id !== workoutId);
    localStorage.setItem(LOCAL_STORAGE_HISTORY, JSON.stringify(updated));
  }

  return deletedFromSupabase;
}
