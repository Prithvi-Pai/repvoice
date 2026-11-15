/**
 * RepVoice Personal Record (PR) Engine (Screens 1, 3, 5)
 * Detects, evaluates, and stores Personal Records (max weight, max reps, max volume).
 * Generates PR delta badges (e.g. "+10 lbs", "+2 reps") for review summaries and history trophies.
 */

import { PersonalRecord, Workout, WeightUnit } from '@/types';
import { getSupabaseClient } from '../supabase/client';
import { isValidUUID, generateUUID } from '../storage';

const LOCAL_STORAGE_PRS = 'repvoice_personal_records';

export const INITIAL_DEMO_PRS: PersonalRecord[] = [
  {
    id: 'pr_bench_press_1',
    exerciseName: 'Barbell Bench Press',
    recordType: 'max_weight',
    recordValue: 195,
    unit: 'lbs',
    reps: 8,
    achievedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    previousValue: 185,
    delta: 10,
  },
  {
    id: 'pr_back_squat_1',
    exerciseName: 'Barbell Back Squat',
    recordType: 'max_weight',
    recordValue: 225,
    unit: 'lbs',
    reps: 5,
    achievedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    previousValue: 215,
    delta: 10,
  },
  {
    id: 'pr_lat_raises_1',
    exerciseName: 'Lateral DB Raises',
    recordType: 'max_weight',
    recordValue: 25,
    unit: 'lbs',
    reps: 12,
    achievedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    previousValue: 20,
    delta: 5,
  },
];

/**
 * Fetch all Personal Records for the user.
 */
export async function getPersonalRecords(): Promise<PersonalRecord[]> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        const { data, error } = await client
          .from('personal_records')
          .select('*')
          .eq('user_id', user.id)
          .order('achieved_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const records: PersonalRecord[] = data.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            exerciseName: r.exercise_name,
            recordType: r.record_type,
            recordValue: Number(r.record_value),
            unit: r.unit || 'lbs',
            reps: r.reps ? Number(r.reps) : undefined,
            workoutId: r.workout_id,
            achievedAt: r.achieved_at,
            previousValue: r.previous_value ? Number(r.previous_value) : undefined,
            delta: r.delta ? Number(r.delta) : undefined,
          }));

          saveLocalPRs(records);
          return records;
        }
      }
    } catch (e) {
      console.warn('Supabase getPersonalRecords fallback to local:', e);
    }
  }

  return getLocalPRs();
}

/**
 * Evaluates completed sets in a finished workout against all existing PRs.
 * Returns newly established Personal Records with calculated delta.
 */
export function evaluateWorkoutPRs(
  workout: Workout,
  existingPRs: PersonalRecord[]
): PersonalRecord[] {
  const newPRs: PersonalRecord[] = [];
  const now = new Date().toISOString();

  // Build a lookup map of existing max weight per canonical exercise name (in lowercase)
  const existingMaxWeightMap = new Map<string, PersonalRecord>();
  for (const pr of existingPRs) {
    if (pr.recordType === 'max_weight') {
      const key = pr.exerciseName.toLowerCase().trim();
      const current = existingMaxWeightMap.get(key);
      if (!current || pr.recordValue > current.recordValue) {
        existingMaxWeightMap.set(key, pr);
      }
    }
  }

  for (const ex of workout.exercises) {
    const exName = ex.exerciseName.trim();
    const key = exName.toLowerCase();
    const existing = existingMaxWeightMap.get(key);

    // Find the heaviest completed set for this exercise in this workout session
    let maxSessionWeight = 0;
    let maxSessionReps = 0;
    let sessionUnit: WeightUnit = 'lbs';

    for (const set of ex.sets) {
      if (set.isCompleted && set.weight > maxSessionWeight) {
        maxSessionWeight = set.weight;
        maxSessionReps = set.reps;
        sessionUnit = set.unit || 'lbs';
      }
    }

    if (maxSessionWeight > 0) {
      if (!existing) {
        // First recorded weight for this exercise is a foundational PR
        const pr: PersonalRecord = {
          id: generateUUID(),
          exerciseName: exName,
          recordType: 'max_weight',
          recordValue: maxSessionWeight,
          unit: sessionUnit,
          reps: maxSessionReps,
          workoutId: workout.id,
          achievedAt: now,
          previousValue: 0,
          delta: maxSessionWeight,
        };
        newPRs.push(pr);
        existingMaxWeightMap.set(key, pr);
      } else if (maxSessionWeight > existing.recordValue) {
        // Established new PR!
        const delta = Math.round((maxSessionWeight - existing.recordValue) * 100) / 100;
        const pr: PersonalRecord = {
          id: generateUUID(),
          exerciseName: exName,
          recordType: 'max_weight',
          recordValue: maxSessionWeight,
          unit: sessionUnit,
          reps: maxSessionReps,
          workoutId: workout.id,
          achievedAt: now,
          previousValue: existing.recordValue,
          delta,
        };
        newPRs.push(pr);
        existingMaxWeightMap.set(key, pr);
      }
    }
  }

  return newPRs;
}

/**
 * Persists new PR records to Supabase and updates local storage.
 */
export async function savePersonalRecords(records: PersonalRecord[]): Promise<void> {
  if (!records || records.length === 0) return;

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        const rows = records.map((r) => ({
          id: isValidUUID(r.id) ? r.id : generateUUID(),
          user_id: user.id,
          exercise_name: r.exerciseName,
          record_type: r.recordType,
          record_value: r.recordValue,
          unit: r.unit,
          reps: r.reps || null,
          workout_id: r.workoutId && isValidUUID(r.workoutId) ? r.workoutId : null,
          achieved_at: r.achievedAt,
          previous_value: r.previousValue || null,
          delta: r.delta || null,
        }));

        await client.from('personal_records').insert(rows);
      }
    } catch (e) {
      console.warn('Supabase savePersonalRecords error:', e);
    }
  }

  // Update local storage
  const current = getLocalPRs();
  const updated = [...records, ...current];
  saveLocalPRs(updated);
}

// Local storage helpers
function getLocalPRs(): PersonalRecord[] {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return INITIAL_DEMO_PRS;
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!storage) return INITIAL_DEMO_PRS;
    const raw = storage.getItem(LOCAL_STORAGE_PRS);
    if (!raw) {
      storage.setItem(LOCAL_STORAGE_PRS, JSON.stringify(INITIAL_DEMO_PRS));
      return INITIAL_DEMO_PRS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_PRS;
  }
}

function saveLocalPRs(records: PersonalRecord[]): void {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return;
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    storage?.setItem(LOCAL_STORAGE_PRS, JSON.stringify(records));
  } catch {
    // ignore
  }
}
