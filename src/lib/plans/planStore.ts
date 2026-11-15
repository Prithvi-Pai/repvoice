/**
 * RepVoice Workout Plans Service (Screen 4: /plan)
 * Provides custom plan management, CRUD operations, Supabase persistence with RLS,
 * local-first offline backup, and instant conversion of plans into live workout sessions.
 */

import { WorkoutPlan, PlanExercise, Workout, WorkoutExercise, WorkoutSet, WeightUnit } from '@/types';
import { getSupabaseClient } from '../supabase/client';
import { isValidUUID, generateUUID } from '../storage';

const LOCAL_STORAGE_PLANS = 'repvoice_workout_plans';

export const DEFAULT_PLANS: WorkoutPlan[] = [
  {
    id: 'plan_full_body_free_split',
    title: 'Full Body Free Split',
    description: 'Balanced compound hypertrophy session with total movement freedom.',
    scheduledDay: 'Tomorrow, Oct 25',
    isActive: true,
    orderIndex: 0,
    exercises: [
      {
        id: 'pe_1_1',
        exerciseName: 'Romanian Deadlift',
        targetSets: 4,
        targetReps: 8,
        targetWeight: 185,
        unit: 'lbs',
        restSeconds: 90,
        orderIndex: 0,
      },
      {
        id: 'pe_1_2',
        exerciseName: 'Lat Pulldown',
        targetSets: 4,
        targetReps: 10,
        targetWeight: 140,
        unit: 'lbs',
        restSeconds: 75,
        orderIndex: 1,
      },
      {
        id: 'pe_1_3',
        exerciseName: 'Incline Dumbbell Press',
        targetSets: 3,
        targetReps: 10,
        targetWeight: 70,
        unit: 'lbs',
        restSeconds: 90,
        orderIndex: 2,
      },
      {
        id: 'pe_1_4',
        exerciseName: 'Hanging Leg Raise',
        targetSets: 3,
        targetReps: 12,
        targetWeight: 0,
        unit: 'lbs',
        restSeconds: 60,
        orderIndex: 3,
      },
    ],
  },
  {
    id: 'plan_glutes_shoulders_combo',
    title: 'Glutes & Shoulders Combo',
    description: 'Targeted posterior chain and boulder shoulder volume.',
    scheduledDay: 'Saturday, Oct 27',
    isActive: true,
    orderIndex: 1,
    exercises: [
      {
        id: 'pe_2_1',
        exerciseName: 'Barbell Hip Thrust',
        targetSets: 4,
        targetReps: 10,
        targetWeight: 225,
        unit: 'lbs',
        restSeconds: 90,
        orderIndex: 0,
      },
      {
        id: 'pe_2_2',
        exerciseName: 'Arnold Press',
        targetSets: 3,
        targetReps: 10,
        targetWeight: 50,
        unit: 'lbs',
        restSeconds: 75,
        orderIndex: 1,
      },
      {
        id: 'pe_2_3',
        exerciseName: 'Bulgarian Split Squat',
        targetSets: 3,
        targetReps: 8,
        targetWeight: 40,
        unit: 'lbs',
        restSeconds: 90,
        orderIndex: 2,
      },
      {
        id: 'pe_2_4',
        exerciseName: 'Cable Lateral Raise',
        targetSets: 3,
        targetReps: 12,
        targetWeight: 20,
        unit: 'lbs',
        restSeconds: 60,
        orderIndex: 3,
      },
      {
        id: 'pe_2_5',
        exerciseName: 'Face Pulls',
        targetSets: 3,
        targetReps: 15,
        targetWeight: 45,
        unit: 'lbs',
        restSeconds: 60,
        orderIndex: 4,
      },
    ],
  },
  {
    id: 'plan_quick_calisthenics_arms',
    title: 'Quick 30-Min Calisthenics & Arms',
    description: 'High-density bodyweight movements and arm pump.',
    scheduledDay: 'Monday, Oct 29',
    isActive: true,
    orderIndex: 2,
    exercises: [
      {
        id: 'pe_3_1',
        exerciseName: 'Pull Ups',
        targetSets: 4,
        targetReps: 10,
        targetWeight: 0,
        unit: 'lbs',
        restSeconds: 75,
        orderIndex: 0,
      },
      {
        id: 'pe_3_2',
        exerciseName: 'Parallel Bar Dips',
        targetSets: 4,
        targetReps: 12,
        targetWeight: 0,
        unit: 'lbs',
        restSeconds: 75,
        orderIndex: 1,
      },
      {
        id: 'pe_3_3',
        exerciseName: 'Incline Bicep Curls',
        targetSets: 3,
        targetReps: 12,
        targetWeight: 30,
        unit: 'lbs',
        restSeconds: 60,
        orderIndex: 2,
      },
    ],
  },
];

/**
 * Retrieve all workout plans (from Supabase if authenticated, with localStorage fallback).
 */
export async function getWorkoutPlans(): Promise<{ plans: WorkoutPlan[]; source: 'supabase' | 'local' }> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data: { user }, error: authErr } = await client.auth.getUser();
      if (!authErr && user) {
        const { data, error } = await client
          .from('workout_plans')
          .select(`
            id,
            user_id,
            title,
            description,
            scheduled_day,
            scheduled_date,
            is_active,
            order_index,
            created_at,
            updated_at,
            plan_exercises (
              id,
              plan_id,
              exercise_name,
              target_sets,
              target_reps,
              target_weight,
              unit,
              rest_seconds,
              order_index
            )
          `)
          .eq('user_id', user.id)
          .order('order_index', { ascending: true });

        if (!error && data && data.length > 0) {
          const formatted: WorkoutPlan[] = data.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            title: row.title,
            description: row.description,
            scheduledDay: row.scheduled_day || 'Scheduled',
            scheduledDate: row.scheduled_date,
            isActive: row.is_active,
            orderIndex: row.order_index ?? 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            exercises: (row.plan_exercises || [])
              .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
              .map((pe: any) => ({
                id: pe.id,
                planId: pe.plan_id,
                exerciseName: pe.exercise_name,
                targetSets: pe.target_sets,
                targetReps: pe.target_reps,
                targetWeight: pe.target_weight ? Number(pe.target_weight) : 0,
                unit: pe.unit || 'lbs',
                restSeconds: pe.rest_seconds || 90,
                orderIndex: pe.order_index ?? 0,
              })),
          }));

          saveLocalPlans(formatted);
          return { plans: formatted, source: 'supabase' };
        }
      }
    } catch (e) {
      console.warn('Supabase getWorkoutPlans fallback to local:', e);
    }
  }

  const local = getLocalPlans();
  return { plans: local, source: 'local' };
}

/**
 * Save or update a workout plan (Upserts to Supabase & writes to localStorage).
 */
export async function saveWorkoutPlan(plan: WorkoutPlan): Promise<{ success: boolean; plan: WorkoutPlan }> {
  const planId = isValidUUID(plan.id) ? plan.id : generateUUID();
  const normalizedPlan: WorkoutPlan = {
    ...plan,
    id: planId,
    updatedAt: new Date().toISOString(),
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        // 1. Upsert parent plan
        const { error: planErr } = await client.from('workout_plans').upsert(
          {
            id: planId,
            user_id: user.id,
            title: normalizedPlan.title,
            description: normalizedPlan.description || null,
            scheduled_day: normalizedPlan.scheduledDay,
            scheduled_date: normalizedPlan.scheduledDate || null,
            is_active: normalizedPlan.isActive,
            order_index: normalizedPlan.orderIndex,
            updated_at: normalizedPlan.updatedAt,
          },
          { onConflict: 'id' }
        );

        if (!planErr) {
          // 2. Re-insert plan exercises
          await client.from('plan_exercises').delete().eq('plan_id', planId);

          if (normalizedPlan.exercises && normalizedPlan.exercises.length > 0) {
            const exerciseRows = normalizedPlan.exercises.map((pe, idx) => ({
              id: isValidUUID(pe.id) ? pe.id : generateUUID(),
              plan_id: planId,
              exercise_name: pe.exerciseName,
              target_sets: pe.targetSets || 3,
              target_reps: pe.targetReps || 10,
              target_weight: pe.targetWeight || 0,
              unit: pe.unit || 'lbs',
              rest_seconds: pe.restSeconds || 90,
              order_index: idx,
            }));

            await client.from('plan_exercises').insert(exerciseRows);
          }
        }
      }
    } catch (e) {
      console.warn('Supabase saveWorkoutPlan error, saved to local cache:', e);
    }
  }

  // Update local storage cache
  const local = getLocalPlans();
  const existingIdx = local.findIndex((p) => p.id === plan.id || p.id === planId);
  let updated: WorkoutPlan[];
  if (existingIdx >= 0) {
    updated = [...local];
    updated[existingIdx] = normalizedPlan;
  } else {
    updated = [normalizedPlan, ...local];
  }
  saveLocalPlans(updated);

  return { success: true, plan: normalizedPlan };
}

/**
 * Delete a workout plan by ID.
 */
export async function deleteWorkoutPlan(planId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('workout_plans').delete().eq('id', planId);
    } catch (e) {
      console.warn('Failed to delete plan from Supabase:', e);
    }
  }

  const local = getLocalPlans();
  const filtered = local.filter((p) => p.id !== planId);
  saveLocalPlans(filtered);
  return true;
}

/**
 * Converts a WorkoutPlan into a live Workout session preloaded with exercises and targets.
 * Enables the athlete to tap "Start Workout from Plan" and begin immediate tracking.
 */
export function instantiateWorkoutFromPlan(plan: WorkoutPlan, preferredUnit: WeightUnit = 'lbs'): Workout {
  const workoutId = generateUUID();

  const exercises: WorkoutExercise[] = plan.exercises.map((pe) => {
    const exId = generateUUID();
    const setsCount = Math.max(1, pe.targetSets || 3);
    const sets: WorkoutSet[] = [];

    for (let s = 1; s <= setsCount; s++) {
      sets.push({
        id: generateUUID(),
        setNumber: s,
        weight: pe.targetWeight ?? 0,
        reps: pe.targetReps ?? 10,
        unit: pe.unit || preferredUnit,
        isCompleted: false,
        status: 'pending',
      });
    }

    return {
      id: exId,
      exerciseName: pe.exerciseName,
      sets,
    };
  });

  return {
    id: workoutId,
    title: plan.title,
    startedAt: new Date().toISOString(),
    notes: plan.description ? `Planned routine: ${plan.description}` : undefined,
    exercises,
    totalSets: exercises.reduce((acc, ex) => acc + ex.sets.length, 0),
  };
}

// Local storage helpers
function getLocalPlans(): WorkoutPlan[] {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return DEFAULT_PLANS;
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!storage) return DEFAULT_PLANS;
    const raw = storage.getItem(LOCAL_STORAGE_PLANS);
    if (!raw) {
      storage.setItem(LOCAL_STORAGE_PLANS, JSON.stringify(DEFAULT_PLANS));
      return DEFAULT_PLANS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PLANS;
  }
}

function saveLocalPlans(plans: WorkoutPlan[]): void {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return;
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    storage?.setItem(LOCAL_STORAGE_PLANS, JSON.stringify(plans));
  } catch {
    // ignore
  }
}
