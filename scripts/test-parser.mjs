import { normalizeSpokenNumbers, parseVoiceInput } from '../src/lib/voice/parser.js';

const testCases = [
  {
    input: "Bench press 60 kilos 10 reps",
    expectedExercise: "Bench Press",
    expectedSetsCount: 1,
    expectedWeight: 60,
    expectedReps: 10,
    expectedUnit: "kg",
  },
  {
    input: "Bench press 60 by 10",
    expectedExercise: "Bench Press",
    expectedSetsCount: 1,
    expectedWeight: 60,
    expectedReps: 10,
  },
  {
    input: "Squat 100 for 5, then 110 for 5",
    expectedExercise: "Squat",
    expectedSetsCount: 2,
    expectedWeightFirst: 100,
    expectedRepsFirst: 5,
  },
  {
    input: "Same weight, 8 reps",
    contextExercise: "Squat",
    lastWeight: 110,
    expectedExercise: "Squat",
    expectedSetsCount: 1,
    expectedWeight: 110,
    expectedReps: 8,
  },
  {
    input: "Barbell row 50 pounds 12 reps",
    expectedExercise: "Barbell Row",
    expectedSetsCount: 1,
    expectedWeight: 50,
    expectedReps: 12,
    expectedUnit: "lbs",
  },
  {
    input: "Incline bench press, 3 sets of 10 at 45 kilos",
    expectedExercise: "Incline Bench Press",
    expectedSetsCount: 3,
    expectedWeight: 45,
    expectedReps: 10,
  },
  {
    input: "Deadlift forty five kilos eight reps",
    expectedExercise: "Deadlift",
    expectedSetsCount: 1,
    expectedWeight: 45,
    expectedReps: 8,
  }
];

let failed = 0;

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  const res = parseVoiceInput(tc.input, tc.contextExercise, tc.lastWeight, 'kg');
  console.log(`\nTest #${i + 1}: "${tc.input}"`);
  console.log(`-> Exercise: "${res.exercise}", Sets:`, JSON.stringify(res.sets));

  let pass = true;
  if (tc.expectedExercise && res.exercise.toLowerCase() !== tc.expectedExercise.toLowerCase()) {
    console.error(`  FAIL Exercise: expected ${tc.expectedExercise}, got ${res.exercise}`);
    pass = false;
  }
  if (tc.expectedSetsCount && res.sets.length !== tc.expectedSetsCount) {
    console.error(`  FAIL Sets Count: expected ${tc.expectedSetsCount}, got ${res.sets.length}`);
    pass = false;
  }
  if (tc.expectedWeight !== undefined && res.sets[0]?.weight !== tc.expectedWeight) {
    console.error(`  FAIL Set 1 Weight: expected ${tc.expectedWeight}, got ${res.sets[0]?.weight}`);
    pass = false;
  }
  if (tc.expectedReps !== undefined && res.sets[0]?.reps !== tc.expectedReps) {
    console.error(`  FAIL Set 1 Reps: expected ${tc.expectedReps}, got ${res.sets[0]?.reps}`);
    pass = false;
  }

  if (pass) {
    console.log(`  ✓ PASS`);
  } else {
    failed++;
  }
}

if (failed === 0) {
  console.log(`\nALL ${testCases.length} TESTS PASSED!`);
} else {
  process.exit(1);
}
