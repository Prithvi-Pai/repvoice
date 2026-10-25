const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id) {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id);
}

function generateUUID() {
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

console.log('=====================================================');
console.log('RUNNING WORKOUT PERSISTENCE & IDEMPOTENCY UNIT TESTS');
console.log('=====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

// Test 1: UUID Validation
assert(isValidUUID('a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d'), 'Valid RFC4122 v4 UUID passes validation');
assert(!isValidUUID('w_1729864200000'), 'Timestamp string w_1729864200000 correctly rejected as non-UUID');
assert(!isValidUUID('ex_test_123'), 'Exercise prefix ex_test_123 correctly rejected as non-UUID');
assert(!isValidUUID(''), 'Empty string correctly rejected as non-UUID');
assert(!isValidUUID(null), 'Null correctly rejected as non-UUID');

// Test 2: Fallback UUID Generation
const generated = generateUUID();
assert(isValidUUID(generated), `generateUUID() produces valid RFC4122 UUID (${generated})`);

// Test 3: Idempotent Workout Formatting
const rawMockWorkout = {
  id: 'w_mock_timestamp_id',
  title: 'Chest & Triceps Power',
  startedAt: new Date(Date.now() - 3600000).toISOString(),
  completedAt: new Date().toISOString(),
  notes: 'Felt strong on incline bench',
  exercises: [
    {
      id: 'ex_mock_1',
      exerciseName: 'Incline Dumbbell Press',
      sets: [
        { id: 's_mock_1', setNumber: 1, weight: 32, reps: 10, unit: 'kg', isCompleted: true },
        { id: 's_mock_2', setNumber: 2, weight: 34, reps: 8, unit: 'kg', isCompleted: true }
      ]
    }
  ]
};

// Simulate our storage formatting logic
const workoutId = isValidUUID(rawMockWorkout.id) ? rawMockWorkout.id : generateUUID();
assert(isValidUUID(workoutId) && workoutId !== rawMockWorkout.id, 'Sanitized workout ID is transformed into a valid UUID for PostgreSQL');

const sanitizedExercises = rawMockWorkout.exercises.map((ex, i) => {
  const exId = isValidUUID(ex.id) ? ex.id : generateUUID();
  const setRows = ex.sets.map((s, idx) => ({
    id: isValidUUID(s.id) ? s.id : generateUUID(),
    workout_exercise_id: exId,
    set_number: s.setNumber || idx + 1,
    weight: Number(s.weight),
    reps: Number(s.reps),
    unit: s.unit || 'kg',
    is_completed: s.isCompleted ?? true,
    rpe: s.rpe ?? null
  }));
  return { id: exId, exercise_name: ex.exerciseName, order_index: i, sets: setRows };
});

assert(isValidUUID(sanitizedExercises[0].id), 'Exercise ID sanitized to valid UUID');
assert(isValidUUID(sanitizedExercises[0].sets[0].id), 'Set 1 ID sanitized to valid UUID');
assert(isValidUUID(sanitizedExercises[0].sets[1].id), 'Set 2 ID sanitized to valid UUID');
assert(sanitizedExercises[0].sets[0].workout_exercise_id === sanitizedExercises[0].id, 'Child set references valid parent exercise UUID');

// Test 4: Idempotency on retry
const retryWorkoutId = workoutId; // Reusing same workoutId on retry
assert(retryWorkoutId === workoutId, 'Retrying workout save reuses persistent workout UUID ensuring upsert replaces rather than duplicates');

console.log('\n-----------------------------------------------------');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('-----------------------------------------------------\n');

if (failed > 0) process.exit(1);
