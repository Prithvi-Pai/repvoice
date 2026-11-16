import { Workout, WorkoutExercise, WorkoutSet, UserProfile, SaveWorkoutResult } from '../types';
import { getSupabaseClient } from './supabase/client';
import { evaluateWorkoutPRs, getPersonalRecords, savePersonalRecords } from './records/personalRecordEngine';
import { calculateEstimatedCalories } from './analytics/metricsEngine';
import { getLocalDateKey, getTodayAndYesterdayKeys } from './history/dateGrouping';
import { calculateSetVolume } from './utils/unitConversion';

const LOCAL_STORAGE_ACTIVE_WORKOUT = 'repvoice_active_workout';
const LOCAL_STORAGE_HISTORY = 'repvoice_history';
const LOCAL_STORAGE_PROFILE = 'repvoice_profile';

const DEFAULT_PROFILE: UserProfile = {
  id: 'guest_user',
  displayName: 'Alex Rivera',
  gender: 'male',
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

// Profile storage & Cloud Persistence
export function getStoredProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROFILE);
    return raw ? JSON.parse(raw) : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

/**
 * Asynchronously persists the user profile and preferences to Supabase Cloud.
 * Dual-syncs to Supabase Auth user_metadata (always available without schema constraints)
 * and public.profiles table (PostgreSQL relational record).
 */
export async function persistProfileToCloud(profile: UserProfile): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return;

    const payload = {
      ...profile,
      id: user.id,
      email: user.email || profile.email,
    };

    // 1. Update Supabase Auth user_metadata (never blocked by RLS or missing columns)
    await client.auth.updateUser({
      data: {
        profile: payload,
      },
    });

    // 2. Also upsert into public.profiles relational table if available
    try {
      await client.from('profiles').upsert(
        {
          id: user.id,
          display_name: profile.displayName || user.user_metadata?.display_name || 'Gym Athlete',
          preferred_unit: profile.preferredUnit || 'lbs',
          recognition_mode: profile.recognitionMode || 'continuous',
          spoken_confirmations: profile.spokenConfirmations !== false,
          beep_on_record: profile.beepOnRecord !== false,
          microphone_sensitivity: profile.microphoneSensitivity || 'aggressive',
          default_rest_timer_seconds: profile.defaultRestTimerSeconds || 90,
          gender: profile.gender || 'male',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (tableErr) {
      console.warn('profiles table upsert notice (user_metadata was saved):', tableErr);
    }
  } catch (err: any) {
    console.warn('persistProfileToCloud notice:', err?.message || err);
  }
}

/**
 * Pulls and synchronizes the user's saved settings from Supabase Cloud on login/session restore.
 * Merges cloud preferences with local storage so user settings persist across devices and re-logins.
 */
export async function syncUserProfileFromCloud(providedUser?: any): Promise<UserProfile> {
  const currentLocal = getStoredProfile();
  const client = getSupabaseClient();
  if (!client) return currentLocal;

  try {
    let authUser = providedUser;
    if (!authUser) {
      const {
        data: { user },
      } = await client.auth.getUser();
      authUser = user;
    }

    if (!authUser) return currentLocal;

    const userId = authUser.id;
    let cloudProfile: Partial<UserProfile> | null = null;

    // Check user_metadata first (fastest and most reliable)
    if (authUser.user_metadata?.profile) {
      cloudProfile = authUser.user_metadata.profile;
    }

    // Also check public.profiles table
    try {
      const { data: profileRow, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && profileRow) {
        cloudProfile = {
          ...cloudProfile,
          id: profileRow.id,
          displayName: profileRow.display_name || cloudProfile?.displayName,
          preferredUnit: profileRow.preferred_unit || cloudProfile?.preferredUnit,
          recognitionMode: profileRow.recognition_mode || cloudProfile?.recognitionMode,
          spokenConfirmations: profileRow.spoken_confirmations ?? cloudProfile?.spokenConfirmations,
          beepOnRecord: profileRow.beep_on_record ?? cloudProfile?.beepOnRecord,
          microphoneSensitivity: profileRow.microphone_sensitivity || cloudProfile?.microphoneSensitivity,
          defaultRestTimerSeconds: profileRow.default_rest_timer_seconds || cloudProfile?.defaultRestTimerSeconds,
          gender: profileRow.gender || cloudProfile?.gender,
        };
      }
    } catch {
      // ignore
    }

    // Check user-specific cached profile in localStorage
    let userCachedProfile: Partial<UserProfile> | null = null;
    if (typeof window !== 'undefined') {
      try {
        const rawUserCache = localStorage.getItem(`${LOCAL_STORAGE_PROFILE}_${userId}`);
        if (rawUserCache) userCachedProfile = JSON.parse(rawUserCache);
      } catch {
        // ignore
      }
    }

    // Merge: DEFAULT < userCached < cloudProfile
    const merged: UserProfile = {
      ...DEFAULT_PROFILE,
      ...userCachedProfile,
      ...cloudProfile,
      id: userId,
      email: authUser.email || currentLocal.email,
    };

    // If cloud had no settings yet, push local settings to cloud
    if (!cloudProfile && (currentLocal.preferredUnit || currentLocal.gender)) {
      merged.preferredUnit = currentLocal.preferredUnit || 'lbs';
      merged.gender = currentLocal.gender || 'male';
      merged.defaultRestTimerSeconds = currentLocal.defaultRestTimerSeconds || 90;
      merged.microphoneSensitivity = currentLocal.microphoneSensitivity || 'aggressive';
      merged.spokenConfirmations = currentLocal.spokenConfirmations !== false;
      merged.beepOnRecord = currentLocal.beepOnRecord !== false;
      merged.recognitionMode = currentLocal.recognitionMode || 'continuous';
      persistProfileToCloud(merged).catch(() => {});
    }

    // Save to local storage & broadcast to all UI listeners
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_PROFILE, JSON.stringify(merged));
        localStorage.setItem(`${LOCAL_STORAGE_PROFILE}_${userId}`, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('repvoice_profile_updated', { detail: merged }));
        window.dispatchEvent(new Event('storage'));
      } catch {
        // ignore
      }
    }

    return merged;
  } catch (err: any) {
    console.warn('syncUserProfileFromCloud notice:', err?.message || err);
    return currentLocal;
  }
}

export function saveStoredProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_PROFILE, JSON.stringify(profile));
    if (profile.id && profile.id !== 'guest_user' && profile.id !== 'guest') {
      localStorage.setItem(`${LOCAL_STORAGE_PROFILE}_${profile.id}`, JSON.stringify(profile));
    }
    window.dispatchEvent(new CustomEvent('repvoice_profile_updated', { detail: profile }));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn('saveStoredProfile localStorage error:', e);
  }

  // Push updates to cloud if authenticated
  persistProfileToCloud(profile).catch(() => {});
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

/**
 * Returns the timestamp in milliseconds of the most recent set activity in a workout.
 */
export function getLatestSetTimestamp(workout: Workout): number | null {
  let latest: number | null = null;
  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      if (s.completedAt) {
        const ms = new Date(s.completedAt).getTime();
        if (!isNaN(ms) && (latest === null || ms > latest)) latest = ms;
      }
      if (s.startedAt) {
        const ms = new Date(s.startedAt).getTime();
        if (!isNaN(ms) && (latest === null || ms > latest)) latest = ms;
      }
    }
  }
  return latest;
}

/**
 * Auto-saves an active in-progress workout when 1 hour elapses without entries or upon user logout.
 * Calculates effective active duration up to the last entry, stops the timer, and marks it resumable for today.
 */
export async function autoSaveActiveWorkout(
  reason: 'inactivity' | 'logout' = 'inactivity'
): Promise<Workout | null> {
  const current = getActiveWorkout();
  if (!current) return null;

  // If there are no exercises and no sets, simply discard empty scratch workout
  const hasLoggedSets = current.exercises.some((e) => e.sets.length > 0);
  if (!hasLoggedSets && current.exercises.length === 0) {
    saveActiveWorkout(null);
    return null;
  }

  const startTime = new Date(current.startedAt).getTime();
  const lastEntryTime = current.lastEntryAt
    ? new Date(current.lastEntryAt).getTime()
    : getLatestSetTimestamp(current) || startTime;

  // Calculate duration up to the last entry (preventing empty idle hours from inflating stats)
  const effectiveDuration = Math.max(0, Math.floor((lastEntryTime - startTime) / 1000));

  const workoutToSave: Workout = {
    ...current,
    completedAt: new Date(lastEntryTime).toISOString(),
    durationSeconds: effectiveDuration,
    isAutoSaved: true,
    notes:
      current.notes ||
      (reason === 'inactivity'
        ? 'Auto-saved after 1 hour without entries'
        : 'Auto-saved on sign out'),
  };

  // Save to Supabase and localStorage history
  await saveFinishedWorkout(workoutToSave);

  // Clear active workout from active slot
  saveActiveWorkout(null);

  return workoutToSave;
}

/**
 * Resumes a completed/auto-saved workout from history so the user can continue logging sets today.
 * Restores its exercises, sets, adjusts startedAt to resume the timer, and removes it from completed history.
 */
export async function resumeWorkoutFromHistory(workoutId: string): Promise<Workout | null> {
  const { workouts } = await getWorkoutHistory();
  const target = workouts.find((w) => w.id === workoutId);
  if (!target) return null;

  // Adjust startedAt so the timer resumes seamlessly with previous active duration
  const priorDuration = target.durationSeconds || 0;
  const adjustedStartedAt = new Date(Date.now() - priorDuration * 1000).toISOString();

  const resumed: Workout = {
    ...target,
    startedAt: adjustedStartedAt,
    completedAt: undefined,
    lastEntryAt: new Date().toISOString(),
    isResumed: true,
  };

  // Remove the completed entry from history so it doesn't duplicate while active
  await deleteWorkoutFromHistory(workoutId);

  // Set as the active workout
  saveActiveWorkout(resumed);

  return resumed;
}

/**
 * Checks if the current active workout has had no entries for 1 hour.
 * If so, automatically stops the timer and saves the workout to history.
 */
export async function checkAndHandleInactivityTimeout(): Promise<Workout | null> {
  const current = getActiveWorkout();
  if (!current) return null;

  const startTime = new Date(current.startedAt).getTime();
  const lastEntryTime = current.lastEntryAt
    ? new Date(current.lastEntryAt).getTime()
    : getLatestSetTimestamp(current) || startTime;

  const oneHourMs = 60 * 60 * 1000;
  if (Date.now() - lastEntryTime >= oneHourMs) {
    console.info('[RepVoice] Inactivity timeout: 1 hour without entries. Auto-saving workout.');
    return await autoSaveActiveWorkout('inactivity');
  }

  return null;
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
  const profile = getStoredProfile();
  const preferredUnit = profile.preferredUnit || 'kg';
  let totalVolume = 0;
  let totalSets = 0;
  let voiceSetsCount = 0;

  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      if (s.isCompleted) {
        totalSets++;
        totalVolume += calculateSetVolume(s.weight, s.reps, s.unit, preferredUnit);
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
  const profile = getStoredProfile();
  const preferredUnit = profile.preferredUnit || 'kg';
  let totalVolume = 0;
  let totalSets = 0;
  let voiceSetsCount = 0;

  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      if (s.isCompleted) {
        totalSets++;
        totalVolume += calculateSetVolume(s.weight, s.reps, s.unit, preferredUnit);
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

/**
 * Updates the title of a workout in both Supabase and localStorage.
 */
export async function updateWorkoutTitle(workoutId: string, newTitle: string): Promise<boolean> {
  const cleanTitle = newTitle.trim();
  if (!cleanTitle) return false;

  const client = getSupabaseClient();
  let updatedInSupabase = false;

  if (client) {
    try {
      const { error } = await client
        .from('workouts')
        .update({ title: cleanTitle })
        .eq('id', workoutId);
      if (!error) updatedInSupabase = true;
    } catch (e) {
      console.error('Failed to update workout title in Supabase:', e);
    }
  }

  // Also update in local storage
  if (typeof window !== 'undefined') {
    const local = getLocalWorkoutHistory();
    const updated = local.map((w) => (w.id === workoutId ? { ...w, title: cleanTitle } : w));
    localStorage.setItem(LOCAL_STORAGE_HISTORY, JSON.stringify(updated));
  }

  return true;
}

/**
 * Updates a full workout record (exercises, sets, volume) in both Supabase and localStorage.
 */
export async function updateWorkoutInHistory(updatedWorkout: Workout): Promise<SaveWorkoutResult> {
  // Recalculate metrics
  const profile = getStoredProfile();
  const preferredUnit = profile.preferredUnit || 'kg';
  let totalVolume = 0;
  let totalSets = 0;
  for (const ex of updatedWorkout.exercises) {
    for (const s of ex.sets) {
      if (s.isCompleted !== false) {
        totalSets++;
        totalVolume += calculateSetVolume(s.weight, s.reps, s.unit, preferredUnit);
      }
    }
  }

  const finished: Workout = {
    ...updatedWorkout,
    totalVolume: Math.round(totalVolume),
    totalSets,
  };

  const client = getSupabaseClient();
  let savedToSupabase = false;

  if (client) {
    try {
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        // 1. Update workout row
        await client
          .from('workouts')
          .update({
            title: finished.title,
            notes: finished.notes || null,
            total_volume: finished.totalVolume,
            total_sets: finished.totalSets,
          })
          .eq('id', finished.id);

        // 2. Refresh exercises & sets in Supabase
        await client.from('workout_exercises').delete().eq('workout_id', finished.id);

        for (let i = 0; i < finished.exercises.length; i++) {
          const ex = finished.exercises[i];
          const exId = isValidUUID(ex.id) ? ex.id : generateUUID();
          const { data: exRow, error: exErr } = await client
            .from('workout_exercises')
            .insert({
              id: exId,
              workout_id: finished.id,
              exercise_name: ex.exerciseName || 'Exercise',
              order_index: i,
            })
            .select()
            .single();

          if (!exErr && exRow && ex.sets.length > 0) {
            const setRows = ex.sets.map((s, idx) => ({
              id: isValidUUID(s.id) ? s.id : generateUUID(),
              workout_exercise_id: exRow.id,
              set_number: s.setNumber || idx + 1,
              weight: Number(s.weight) || 0,
              reps: Number(s.reps) || 0,
              unit: s.unit || 'kg',
              is_completed: s.isCompleted ?? true,
            }));
            await client.from('workout_sets').insert(setRows);
          }
        }
        savedToSupabase = true;
      }
    } catch (err) {
      console.error('Failed to update workout in Supabase:', err);
    }
  }

  // Update in localStorage
  if (typeof window !== 'undefined') {
    const local = getLocalWorkoutHistory();
    const updated = local.map((w) => (w.id === finished.id ? finished : w));
    localStorage.setItem(LOCAL_STORAGE_HISTORY, JSON.stringify(updated));
  }

  return {
    success: true,
    persistedTo: savedToSupabase ? 'supabase' : 'local_fallback',
  };
}
