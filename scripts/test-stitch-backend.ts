/**
 * Comprehensive Unit & Integration Test Suite for RepVoice Stitch Backend Modules
 * Tests:
 * 1. Plan Management & Instantiation (planStore.ts)
 * 2. Personal Record Evaluation & Delta Calculation (personalRecordEngine.ts)
 * 3. Previous Performance Benchmark Lookups (previousPerformance.ts)
 * 4. Analytics, Streaks, Volume & Calorie Burn Metrics (metricsEngine.ts)
 * 5. Audio Feedback DSP Constraints (audioFeedback.ts)
 */

import { DEFAULT_PLANS, instantiateWorkoutFromPlan, getWorkoutPlans, saveWorkoutPlan, deleteWorkoutPlan } from '../src/lib/plans/planStore';
import { evaluateWorkoutPRs, INITIAL_DEMO_PRS } from '../src/lib/records/personalRecordEngine';
import { getPreviousPerformanceForExercise, getPreviousExerciseMap } from '../src/lib/history/previousPerformance';
import {
  calculateHomeDashboardMetrics,
  calculateWorkoutReviewMetrics,
  calculateMonthlyRollup,
  calculateEstimatedCalories
} from '../src/lib/analytics/metricsEngine';
import { getNoiseFilterConstraints } from '../src/lib/voice/audioFeedback';
import { Workout, WorkoutPlan, PersonalRecord, UserProfile } from '../src/types';

// Mock localStorage for Node environment
if (typeof global.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

async function run() {
  console.log('=====================================================');
  console.log('RUNNING REPVOICE STITCH BACKEND MODULE TESTS');
  console.log('=====================================================\n');

  // -----------------------------------------------------------------------------
  // MODULE 1: WORKOUT PLAN STORE & INSTANTIATION
  // -----------------------------------------------------------------------------
  console.log('--- 1. WORKOUT PLANS & INSTANTIATION (planStore.ts) ---');

  assert(DEFAULT_PLANS.length >= 2, 'Default starter plans include Full Body Split and Glutes & Shoulders');
  const samplePlan = DEFAULT_PLANS[0];
  assert(samplePlan.exercises.length === 4, 'Full Body Free Split contains 4 target exercises');

  const liveWorkout = instantiateWorkoutFromPlan(samplePlan);
  assert(liveWorkout.title === samplePlan.title, 'Instantiated workout preserves plan title');
  assert(liveWorkout.exercises.length === samplePlan.exercises.length, 'Instantiated workout preserves all exercise targets');
  assert(liveWorkout.exercises[0].exerciseName === 'Romanian Deadlift', 'First exercise is Romanian Deadlift');
  assert(liveWorkout.exercises[0].sets.length === 4, 'Target sets (4) mapped to 4 active workout set rows');
  assert(liveWorkout.exercises[0].sets[0].weight === 185, 'Pre-fills target weight (185 lbs)');
  assert(liveWorkout.exercises[0].sets[0].reps === 8, 'Pre-fills target reps (8)');
  assert(liveWorkout.exercises[0].sets[0].isCompleted === false, 'Initial instantiated sets are not completed');

  // Plan CRUD test
  const customPlan: WorkoutPlan = {
    id: 'custom_plan_chest_day',
    title: 'Heavy Chest & Triceps',
    description: 'Chest hyper-focus routine',
    scheduledDay: 'Monday',
    isActive: true,
    orderIndex: 2,
    exercises: [
      {
        id: 'cpe_1',
        exerciseName: 'Flat Dumbbell Press',
        targetSets: 4,
        targetReps: 10,
        targetWeight: 80,
        unit: 'lbs',
        restSeconds: 90,
        orderIndex: 0,
      },
    ],
  };

  const saveResult = await saveWorkoutPlan(customPlan);
  const savedId = saveResult.plan.id;
  const resAfterSave = await getWorkoutPlans();
  assert(
    resAfterSave.plans.some((p) => p.id === savedId),
    'Custom workout plan successfully saved to local store'
  );

  await deleteWorkoutPlan(savedId);
  const resAfterDelete = await getWorkoutPlans();
  assert(
    !resAfterDelete.plans.some((p) => p.id === savedId),
    'Custom workout plan successfully deleted from local store'
  );

  console.log('');

  // -----------------------------------------------------------------------------
  // MODULE 2: PERSONAL RECORD ENGINE & DELTA CALCULATION
  // -----------------------------------------------------------------------------
  console.log('--- 2. PERSONAL RECORD ENGINE (personalRecordEngine.ts) ---');

  const existingPRs: PersonalRecord[] = [
    {
      id: 'pr_bench_1',
      exerciseName: 'Barbell Bench Press',
      recordType: 'max_weight',
      recordValue: 200,
      unit: 'lbs',
      reps: 5,
      achievedAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'pr_squat_1',
      exerciseName: 'Barbell Back Squat',
      recordType: 'max_weight',
      recordValue: 250,
      unit: 'lbs',
      reps: 5,
      achievedAt: '2026-10-01T10:00:00Z',
    },
  ];

  // Workout beating bench press weight PR (205 lbs vs 200 lbs)
  const workoutWithNewPR: Workout = {
    id: 'w_pr_test_1',
    title: 'Chest Day',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date().toISOString(),
    exercises: [
      {
        id: 'ex_1',
        exerciseName: 'Barbell Bench Press',
        sets: [
          { id: 's_1', setNumber: 1, weight: 185, reps: 8, unit: 'lbs', isCompleted: true },
          { id: 's_2', setNumber: 2, weight: 205, reps: 5, unit: 'lbs', isCompleted: true },
        ],
      },
    ],
  };

  const newPRs = evaluateWorkoutPRs(workoutWithNewPR, existingPRs);
  assert(newPRs.length > 0, 'Correctly detected new PR in completed workout');
  const benchPR = newPRs.find((pr) => pr.exerciseName === 'Barbell Bench Press' && pr.recordType === 'max_weight');
  assert(benchPR !== undefined, 'Found Barbell Bench Press max_weight PR');
  assert(benchPR?.recordValue === 205, 'PR recordValue is 205 lbs');
  assert(benchPR?.previousValue === 200, 'Previous value is accurately captured as 200 lbs');
  assert(benchPR?.delta === 5, 'PR delta is correctly calculated as +5 lbs');

  // Workout not beating PR
  const workoutWithoutPR: Workout = {
    id: 'w_pr_test_2',
    title: 'Leg Day Light',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date().toISOString(),
    exercises: [
      {
        id: 'ex_2',
        exerciseName: 'Barbell Back Squat',
        sets: [
          { id: 's_3', setNumber: 1, weight: 225, reps: 5, unit: 'lbs', isCompleted: true },
        ],
      },
    ],
  };

  const emptyPRs = evaluateWorkoutPRs(workoutWithoutPR, existingPRs);
  const squatPR = emptyPRs.find((pr) => pr.exerciseName === 'Barbell Back Squat' && pr.recordType === 'max_weight');
  assert(squatPR === undefined, 'Does not establish PR when lifted weight (225 lbs) is below existing PR (250 lbs)');

  console.log('');

  // -----------------------------------------------------------------------------
  // MODULE 3: PREVIOUS PERFORMANCE BENCHMARKS (previousPerformance.ts)
  // -----------------------------------------------------------------------------
  console.log('--- 3. PREVIOUS PERFORMANCE LOOKUPS (previousPerformance.ts) ---');

  const historyWorkouts: Workout[] = [
    {
      id: 'w_hist_1',
      title: 'Push Day A',
      startedAt: '2026-10-20T10:00:00Z',
      completedAt: '2026-10-20T11:00:00Z',
      exercises: [
        {
          id: 'he_1',
          exerciseName: 'Incline Dumbbell Press',
          sets: [
            { id: 'hs_1', setNumber: 1, weight: 65, reps: 10, unit: 'lbs', isCompleted: true },
            { id: 'hs_2', setNumber: 2, weight: 70, reps: 8, unit: 'lbs', isCompleted: true },
          ],
        },
      ],
    },
    {
      id: 'w_hist_2',
      title: 'Push Day B',
      startedAt: '2026-10-24T10:00:00Z',
      completedAt: '2026-10-24T11:00:00Z',
      exercises: [
        {
          id: 'he_2',
          exerciseName: 'Incline Dumbbell Press',
          sets: [
            { id: 'hs_3', setNumber: 1, weight: 70, reps: 10, unit: 'lbs', isCompleted: true },
            { id: 'hs_4', setNumber: 2, weight: 75, reps: 8, unit: 'lbs', isCompleted: true },
          ],
        },
      ],
    },
  ];

  const prevSets = getPreviousPerformanceForExercise('Incline Dumbbell Press', historyWorkouts);
  assert(prevSets.length === 2, 'Found 2 sets from most recent historical session (Push Day B)');
  assert(prevSets[0].formatted === '70 × 10', 'Set 1 correctly formatted as "70 × 10"');
  assert(prevSets[1].formatted === '75 × 8', 'Set 2 correctly formatted as "75 × 8"');

  // Case-insensitive lookup test
  const prevSetsCase = getPreviousPerformanceForExercise('incline dumbbell press', historyWorkouts);
  assert(prevSetsCase.length === 2, 'Lookup is case-insensitive');

  // Non-existent exercise test
  const nonExistent = getPreviousPerformanceForExercise('Z-Press', historyWorkouts);
  assert(nonExistent.length === 0, 'Returns empty array for exercise not found in history');

  // Map generator test
  const perfMap = getPreviousExerciseMap(historyWorkouts);
  assert(perfMap['incline dumbbell press'] !== undefined, 'Lookup map keyed by lowercase exercise name');
  assert(perfMap['incline dumbbell press'][0].weight === 70, 'Pre-computed map contains latest weight');

  console.log('');

  // -----------------------------------------------------------------------------
  // MODULE 4: METRICS & ANALYTICS ENGINE (metricsEngine.ts)
  // -----------------------------------------------------------------------------
  console.log('--- 4. METRICS & ANALYTICS ENGINE (metricsEngine.ts) ---');

  // Calorie Burn Estimation
  const calories = calculateEstimatedCalories(3600, 15000, 15); // 1 hr, 15,000 lbs volume, 15 sets
  assert(calories >= 250 && calories <= 550, `Calorie burn (${calories} kcal) is within physiologically accurate range (250-550 kcal)`);

  // Dashboard Streak & Volume
  const now = Date.now();
  const oneDayMs = 86400000;

  const streakHistory: Workout[] = [
    // Today's workout
    {
      id: 'w_streak_0',
      title: 'Workout Today',
      startedAt: new Date(now).toISOString(),
      completedAt: new Date(now).toISOString(),
      exercises: [
        {
          id: 'se_0',
          exerciseName: 'Bench Press',
          sets: [{ id: 'ss_0', setNumber: 1, weight: 100, reps: 10, unit: 'lbs', isCompleted: true }],
        },
      ],
    },
    // Yesterday's workout
    {
      id: 'w_streak_1',
      title: 'Workout Yesterday',
      startedAt: new Date(now - oneDayMs).toISOString(),
      completedAt: new Date(now - oneDayMs).toISOString(),
      exercises: [
        {
          id: 'se_1',
          exerciseName: 'Pull Ups',
          sets: [{ id: 'ss_1', setNumber: 1, weight: 0, reps: 10, unit: 'lbs', isCompleted: true }],
        },
      ],
    },
    // 2 days ago workout
    {
      id: 'w_streak_2',
      title: 'Workout 2 Days Ago',
      startedAt: new Date(now - 2 * oneDayMs).toISOString(),
      completedAt: new Date(now - 2 * oneDayMs).toISOString(),
      exercises: [
        {
          id: 'se_2',
          exerciseName: 'Squats',
          sets: [{ id: 'ss_2', setNumber: 1, weight: 200, reps: 5, unit: 'lbs', isCompleted: true }],
        },
      ],
    },
  ];

  const dashboardMetrics = calculateHomeDashboardMetrics(streakHistory);
  assert(dashboardMetrics.streakDays === 3, `Calculated 3-day consecutive workout streak (got ${dashboardMetrics.streakDays})`);
  assert(dashboardMetrics.weeklyVolume === 2000, `Calculated weekly volume (100*10 + 0*10 + 200*5 = 2000 lbs, got ${dashboardMetrics.weeklyVolume})`);
  assert(dashboardMetrics.totalWorkoutsCount === 3, 'Total workouts count is 3');

  // Review Summary Metrics
  const finishedWorkout: Workout = {
    id: 'w_fin_1',
    title: 'Full Body Blast',
    startedAt: new Date(now - 2400000).toISOString(), // 40 mins ago
    completedAt: new Date(now).toISOString(),
    durationSeconds: 2400,
    exercises: [
      {
        id: 'fe_1',
        exerciseName: 'Overhead Press',
        sets: [
          { id: 'fs_1', setNumber: 1, weight: 100, reps: 10, unit: 'lbs', isCompleted: true, isVoiceLogged: true },
          { id: 'fs_2', setNumber: 2, weight: 100, reps: 10, unit: 'lbs', isCompleted: true, isVoiceLogged: true },
          { id: 'fs_3', setNumber: 3, weight: 100, reps: 10, unit: 'lbs', isCompleted: true, isVoiceLogged: false }, // manual
        ],
      },
    ],
  };

  const reviewMetrics = calculateWorkoutReviewMetrics(finishedWorkout, existingPRs);
  assert(reviewMetrics.totalSets === 3, 'Review metrics totalSets is 3');
  assert(reviewMetrics.totalVolume === 3000, 'Review metrics totalVolume is 3000 lbs');
  assert(reviewMetrics.formattedDuration === '40m 0s', `Duration formatted as "40m 0s" (got ${reviewMetrics.formattedDuration})`);
  assert(reviewMetrics.voiceSetsCount === 2, 'Accurately counted 2 voice-logged sets');
  assert(reviewMetrics.voiceSyncPercent === 67, `Voice sync accuracy is 67% (got ${reviewMetrics.voiceSyncPercent}%)`);

  // Monthly Rollup
  const monthlyRollup = calculateMonthlyRollup(streakHistory);
  assert(monthlyRollup.totalWorkouts === 3, 'Monthly rollup total workouts is 3');
  assert(monthlyRollup.totalVolume === 2000, 'Monthly rollup total volume is 2000');

  console.log('');

  // -----------------------------------------------------------------------------
  // MODULE 5: AUDIO FEEDBACK DSP CONSTRAINTS (audioFeedback.ts)
  // -----------------------------------------------------------------------------
  console.log('--- 5. AUDIO FEEDBACK & DSP CONSTRAINTS (audioFeedback.ts) ---');

  const aggressiveConstraints = getNoiseFilterConstraints('aggressive');
  assert(aggressiveConstraints.noiseSuppression === true, 'Aggressive preset enables noise suppression');
  assert(aggressiveConstraints.echoCancellation === true, 'Aggressive preset enables echo cancellation');
  assert(aggressiveConstraints.autoGainControl === true, 'Aggressive preset enables AGC');

  const quietConstraints = getNoiseFilterConstraints('quiet');
  assert(quietConstraints.noiseSuppression === false, 'Quiet preset disables heavy noise suppression');

  console.log('');
  console.log('-----------------------------------------------------');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('-----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled error in test runner:', err);
  process.exit(1);
});
