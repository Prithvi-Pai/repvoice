import { Workout, WorkoutExercise, WorkoutSet, UserProfile, SaveWorkoutResult } from '../types';
import { getSupabaseClient } from './supabase/client';
import { evaluateWorkoutPRs, getPersonalRecords, savePersonalRecords } from './records/personalRecordEngine';
import { calculateEstimatedCalories } from './analytics/metricsEngine';

const LOCAL_STORAGE_ACTIVE_WORKOUT = 'repvoice_active_workout';
const LOCAL_STORAGE_HISTORY = 'repvoice_history';
const LOCAL_STORAGE_PROFILE = 'repvoice_profile';

const DEFAULT_PROFILE: UserProfile = {
  id: 'guest_user',
  displayName: 'Alex Rivera',
  preferredUnit: 'lbs',
  recognitionMode: 'continuous',
  spokenConfirmations: true,
  beepOnRecord: true,
  microphoneSensitivity: 'aggressive',
  defaultRestTimerSeconds: 90,
  tier: 'ultra',
  avatarUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuClVv5wgXLrvyRzdO7Eik3r5l8aISphqWp3hold4ED1IKJ7-NhddH-_U_1b4pLpvodGjpHHYXujZcKxS_GERyM-_wguqO5mZKdhuxV7TTJccItS4cw9OVX5Ue2k58i_844QOF_Z_VQf11JKvHGtSWkaBabR9cOPddr2WQ4UzOct0hXePTEuxSps5K74srBgsYKsa-kCy_SYc4X-bdudvAR89C1fTD2tBzyoimXs7dk',
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
    if (!raw) return null;
    const parsed: Workout = JSON.parse(raw);
    if (parsed && parsed.completedAt) {
      // Completed workout must never be treated as active in-progress
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_WORKOUT);
      return null;
    }
    return parsed;
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
            duration_seconds,
            avg_rest_seconds,
            calories_burned,
            total_volume,
            total_sets,
            voice_sets_count,
            snapshot_url,
            snapshot_location,
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
                rpe,
                is_voice_logged,
                duration_seconds,
                started_at,
                completed_at
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
              durationSeconds: w.duration_seconds ? Number(w.duration_seconds) : undefined,
              avgRestSeconds: w.avg_rest_seconds ? Number(w.avg_rest_seconds) : undefined,
              caloriesBurned: w.calories_burned ? Number(w.calories_burned) : undefined,
              totalVolume: w.total_volume ? Number(w.total_volume) : undefined,
              totalSets: w.total_sets ? Number(w.total_sets) : undefined,
              voiceSetsCount: w.voice_sets_count ? Number(w.voice_sets_count) : undefined,
              snapshotUrl: w.snapshot_url || undefined,
              snapshotLocation: w.snapshot_location || undefined,
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
                    isVoiceLogged: ws.is_voice_logged ?? true,
                    durationSeconds: ws.duration_seconds ? Number(ws.duration_seconds) : undefined,
                    startedAt: ws.started_at || undefined,
                    completedAt: ws.completed_at || undefined,
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

// UUID validation and fallback generator
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function saveFinishedWorkout(workout: Workout): Promise<SaveWorkoutResult> {
  const workoutId = isValidUUID(workout.id) ? workout.id : generateUUID();

  // Compute session telemetry
  let totalVolume = 0;
  let totalSets = 0;
  let voiceSetsCount = 0;

  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      if (s.isCompleted) {
        totalSets++;
        totalVolume += (s.weight || 0) * (s.reps || 0);
        if (s.isVoiceLogged !== false) voiceSetsCount++;
      }
    }
  }

  const startMs = new Date(workout.startedAt).getTime();
  const endMs = workout.completedAt ? new Date(workout.completedAt).getTime() : Date.now();
  const durationSeconds = workout.durationSeconds || Math.max(1, Math.round((endMs - startMs) / 1000));
  const caloriesBurned = workout.caloriesBurned || calculateEstimatedCalories(durationSeconds, totalVolume, totalSets);

  const finishedWorkout: Workout = {
    ...workout,
    id: workoutId,
    completedAt: workout.completedAt || new Date().toISOString(),
    durationSeconds,
    avgRestSeconds: workout.avgRestSeconds || 64,
    caloriesBurned,
    totalVolume: Math.round(totalVolume),
    totalSets,
    voiceSetsCount,
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

      // 1. Upsert workout row to prevent duplicates on retries
      const { data: workoutRow, error: wError } = await client
        .from('workouts')
        .upsert(
          {
            id: workoutId,
            user_id: user.id,
            title: finishedWorkout.title || 'Workout Session',
            notes: finishedWorkout.notes || null,
            started_at: finishedWorkout.startedAt,
            completed_at: finishedWorkout.completedAt,
            duration_seconds: finishedWorkout.durationSeconds,
            avg_rest_seconds: finishedWorkout.avgRestSeconds,
            calories_burned: finishedWorkout.caloriesBurned,
            total_volume: finishedWorkout.totalVolume,
            total_sets: finishedWorkout.totalSets,
            voice_sets_count: finishedWorkout.voiceSetsCount,
            snapshot_url: finishedWorkout.snapshotUrl || null,
            snapshot_location: finishedWorkout.snapshotLocation || null,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (wError) throw new Error(`Workout insert failed: ${wError.message}`);

      // Clean up any existing exercises from prior partial attempt to ensure idempotency
      await client.from('workout_exercises').delete().eq('workout_id', workoutRow.id);

      // 2. Insert exercises and sets
      for (let i = 0; i < finishedWorkout.exercises.length; i++) {
        const ex = finishedWorkout.exercises[i];
        const exerciseId = isValidUUID(ex.id) ? ex.id : generateUUID();
        const { data: exRow, error: exError } = await client
          .from('workout_exercises')
          .insert({
            id: exerciseId,
            workout_id: workoutRow.id,
            exercise_name: ex.exerciseName || 'Exercise',
            order_index: i,
          })
          .select()
          .single();

        if (exError) throw new Error(`Exercise insert failed: ${exError.message}`);

        if (ex.sets.length > 0) {
          const setRows = ex.sets.map((s, idx) => ({
            id: isValidUUID(s.id) ? s.id : generateUUID(),
            workout_exercise_id: exRow.id,
            set_number: s.setNumber || idx + 1,
            weight: Number(s.weight) || 0,
            reps: Number(s.reps) || 0,
            unit: s.unit || 'kg',
            is_completed: s.isCompleted ?? true,
            rpe: s.rpe ? Number(s.rpe) : null,
            is_voice_logged: s.isVoiceLogged ?? true,
            duration_seconds: s.durationSeconds || null,
            started_at: s.startedAt || null,
            completed_at: s.completedAt || null,
          }));

          const { error: setsError } = await client
            .from('workout_sets')
            .insert(setRows);

          if (setsError) throw new Error(`Sets insert failed: ${setsError.message}`);
        }
      }

      // Evaluate PRs asynchronously
      getPersonalRecords().then((existingPRs) => {
        const newPRs = evaluateWorkoutPRs(finishedWorkout, existingPRs);
        if (newPRs.length > 0) {
          savePersonalRecords(newPRs).catch((err) => console.warn('PR evaluation save error:', err));
        }
      });

      // Only remove from active workout once Supabase confirms success
      saveActiveWorkout(null);

      // Keep local backup as well
      try {
        const local = getLocalWorkoutHistory();
        const updated = [{ ...finishedWorkout, id: workoutRow.id }, ...local.filter((w) => w.id !== workout.id && w.id !== workoutRow.id)];
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
      return {
        success: false,
        error: e?.message || 'Database error while saving workout to Supabase.',
        persistedTo: 'local_fallback',
      };
    }
  }

  // If Supabase client is not available, delegate to saveWorkoutLocally
  return saveWorkoutLocally(finishedWorkout);
}

export function saveWorkoutLocally(workout: Workout): SaveWorkoutResult {
  const workoutId = isValidUUID(workout.id) ? workout.id : generateUUID();

  // Compute session telemetry if missing
  let totalVolume = 0;
  let totalSets = 0;
  let voiceSetsCount = 0;

  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      if (s.isCompleted) {
        totalSets++;
        totalVolume += (s.weight || 0) * (s.reps || 0);
        if (s.isVoiceLogged !== false) voiceSetsCount++;
      }
    }
  }

  const startMs = new Date(workout.startedAt).getTime();
  const endMs = workout.completedAt ? new Date(workout.completedAt).getTime() : Date.now();
  const durationSeconds = workout.durationSeconds || Math.max(1, Math.round((endMs - startMs) / 1000));
  const caloriesBurned = workout.caloriesBurned || calculateEstimatedCalories(durationSeconds, totalVolume, totalSets);

  const finishedWorkout: Workout = {
    ...workout,
    id: workoutId,
    completedAt: workout.completedAt || new Date().toISOString(),
    durationSeconds,
    avgRestSeconds: workout.avgRestSeconds || 64,
    caloriesBurned,
    totalVolume: Math.round(totalVolume),
    totalSets,
    voiceSetsCount,
  };

  try {
    const local = getLocalWorkoutHistory();
    const updated = [finishedWorkout, ...local.filter((w) => w.id !== workout.id && w.id !== workoutId)];
    localStorage.setItem(LOCAL_STORAGE_HISTORY, JSON.stringify(updated));
    saveActiveWorkout(null);

    // Evaluate PRs locally
    getPersonalRecords().then((existingPRs) => {
      const newPRs = evaluateWorkoutPRs(finishedWorkout, existingPRs);
      if (newPRs.length > 0) {
        savePersonalRecords(newPRs).catch((err) => console.warn('Local PR save error:', err));
      }
    });

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
