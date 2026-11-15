import assert from 'assert';

// Inline replication of the matching logic from exerciseStore.ts to test under Node ESM
function areExercisesMatching(
  nameA,
  nameB,
  customAliases = {}
) {
  if (!nameA || !nameB) return false;
  const cleanA = nameA.trim();
  const cleanB = nameB.trim();
  const lowerA = cleanA.toLowerCase();
  const lowerB = cleanB.toLowerCase();

  // 1. Direct case-insensitive match
  if (lowerA === lowerB) return true;

  // 2. Custom alias resolution
  const resolvedA = customAliases[lowerA] ? customAliases[lowerA].toLowerCase() : lowerA;
  const resolvedB = customAliases[lowerB] ? customAliases[lowerB].toLowerCase() : lowerB;
  if (resolvedA === resolvedB) return true;

  // 3. Normalized whitespace & punctuation
  const stripNoise = (str) =>
    str
      .replace(/[\-–—_()[\],.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const normA = stripNoise(resolvedA);
  const normB = stripNoise(resolvedB);
  if (normA === normB) return true;

  // 4. Plural / stem normalization across words
  const singularStem = (str) => {
    return str
      .split(' ')
      .map((w) => {
        if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
        if (w.endsWith('sses') || w.endsWith('ches') || w.endsWith('shes') || w.endsWith('xes')) return w.slice(0, -2);
        if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
        return w;
      })
      .join(' ');
  };
  if (singularStem(normA) === singularStem(normB)) return true;

  // 5. Canonical Exercise Family Groupings
  const isBenchFamily = (name) => {
    const lower = name.toLowerCase();
    return (
      (/\bbench\b/i.test(lower) || /\bflat\s*bench\b/i.test(lower)) &&
      !/\bincline\b/i.test(lower) &&
      !/\bdecline\b/i.test(lower) &&
      !/\bdumbbell\b/i.test(lower) &&
      !/\bdb\b/i.test(lower) &&
      !/\bclose\s*grip\b/i.test(lower)
    );
  };
  if (isBenchFamily(cleanA) && isBenchFamily(cleanB)) return true;

  const isSquatFamily = (name) => {
    const lower = name.toLowerCase();
    return (
      /\bsquat\b/i.test(lower) &&
      !/\bfront\b/i.test(lower) &&
      !/\bhack\b/i.test(lower) &&
      !/\bgoblet\b/i.test(lower) &&
      !/\bsplit\b/i.test(lower)
    );
  };
  if (isSquatFamily(cleanA) && isSquatFamily(cleanB)) return true;

  const isDeadliftFamily = (name) => {
    const lower = name.toLowerCase();
    return (
      /\bdeadlift\b/i.test(lower) &&
      !/\bromanian\b/i.test(lower) &&
      !/\brdl\b/i.test(lower) &&
      !/\bsumo\b/i.test(lower) &&
      !/\bstiff\b/i.test(lower)
    );
  };
  if (isDeadliftFamily(cleanA) && isDeadliftFamily(cleanB)) return true;

  return false;
}

function findMatchingExerciseIndex(exercises, exerciseName, customAliases = {}) {
  if (!exercises || exercises.length === 0 || !exerciseName) return -1;
  return exercises.findIndex((ex) =>
    areExercisesMatching(ex.exerciseName, exerciseName, customAliases)
  );
}

console.log('=====================================================');
console.log('RUNNING SECTION 4: EXERCISE MATCHING & LOGGING TESTS');
console.log('=====================================================\n');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`, err);
    process.exit(1);
  }
}

// 1. Direct and case-insensitive matching
test('Direct exact and case matching', () => {
  assert(areExercisesMatching('Bench Press', 'bench press'));
  assert(areExercisesMatching('bench press', 'BENCH PRESS'));
  assert(areExercisesMatching('Squat', 'squat'));
});

// 2. Singular/plural matching
test('Singular / plural variation matching', () => {
  assert(areExercisesMatching('Dumbbell Row', 'Dumbbell Rows'));
  assert(areExercisesMatching('Lateral Raise', 'Lateral Raises'));
  assert(areExercisesMatching('Squats', 'Squat'));
  assert(areExercisesMatching('Bicep Curl', 'Bicep Curls'));
});

// 3. Canonical Bench, Squat, Deadlift lift families
test('Canonical exercise family matching', () => {
  assert(areExercisesMatching('Bench Press', 'Barbell Bench Press'));
  assert(areExercisesMatching('Flat Bench Press', 'Bench Press'));
  assert(areExercisesMatching('Barbell Squat', 'Squat'));
  assert(areExercisesMatching('Conventional Deadlift', 'Deadlift'));
});

// 4. Distinct exercises MUST NOT match
test('Different exercises do not match (Scenario D)', () => {
  assert(!areExercisesMatching('Bench Press', 'Shoulder Press'));
  assert(!areExercisesMatching('Bench Press', 'Incline Bench Press'));
  assert(!areExercisesMatching('Bench Press', 'Dumbbell Bench Press'));
  assert(!areExercisesMatching('Deadlift', 'Romanian Deadlift'));
  assert(!areExercisesMatching('Squat', 'Front Squat'));
});

// 5. Custom alias matching
test('Custom learned alias matching (Scenario B)', () => {
  const aliases = { 'chest press': 'Bench Press' };
  assert(areExercisesMatching('chest press', 'Bench Press', aliases));
  assert(areExercisesMatching('Bench Press', 'chest press', aliases));
});

// 6. Scenario A: Repeated exercise automatic set-number progression
test('Scenario A: Consecutive sets of Bench Press increment set number', () => {
  let workout = {
    exercises: [
      { id: 'ex_1', exerciseName: 'Bench Press', sets: [{ setNumber: 1, weight: 40, reps: 10 }] }
    ]
  };

  // User repeats: "Bench press, 40 kg, 10 reps"
  const idx = findMatchingExerciseIndex(workout.exercises, 'Bench press');
  assert.strictEqual(idx, 0, 'Finds existing Bench Press');

  // Appends Set 2
  const nextSetNum = workout.exercises[idx].sets.length + 1;
  assert.strictEqual(nextSetNum, 2, 'Increments to Set 2');
  workout.exercises[idx].sets.push({ setNumber: nextSetNum, weight: 40, reps: 10 });

  // User repeats again for Set 3
  const idx3 = findMatchingExerciseIndex(workout.exercises, 'Bench press');
  const nextSetNum3 = workout.exercises[idx3].sets.length + 1;
  assert.strictEqual(nextSetNum3, 3, 'Increments to Set 3');
  workout.exercises[idx3].sets.push({ setNumber: nextSetNum3, weight: 40, reps: 10 });

  assert.strictEqual(workout.exercises.length, 1, 'Only 1 exercise entry created');
  assert.strictEqual(workout.exercises[0].sets.length, 3, 'Total 3 sets recorded');
  assert.strictEqual(workout.exercises[0].sets[2].setNumber, 3);
});

// 7. Scenario B: Misrecognized exercise manually corrected
test('Scenario B: Manual correction authoritative match and set appending', () => {
  // Existing session already has Set 1 for Bench Press
  let workout = {
    exercises: [
      { id: 'ex_1', exerciseName: 'Bench Press', sets: [{ setNumber: 1, weight: 40, reps: 10 }] }
    ]
  };

  // User says "Bench press, 40 kg, 10 reps", but speech recognition yielded "french press"
  // User manually selects/corrects exercise to: "Bench Press"
  const userSelectedExercise = 'Bench Press';
  const existingIdx = findMatchingExerciseIndex(workout.exercises, userSelectedExercise);
  assert.strictEqual(existingIdx, 0, 'Authoritative correction matches existing Bench Press');

  const targetSetNum = workout.exercises[existingIdx].sets.length + 1;
  assert.strictEqual(targetSetNum, 2, 'Becomes Set 2, not a new exercise with Set 1');

  workout.exercises[existingIdx].sets.push({ setNumber: targetSetNum, weight: 40, reps: 10 });
  assert.strictEqual(workout.exercises[0].sets.length, 2);
  assert.strictEqual(workout.exercises[0].sets[0].setNumber, 1);
  assert.strictEqual(workout.exercises[0].sets[1].setNumber, 2);
});

// 8. Scenario C: Same exercise, different weight or reps
test('Scenario C: Same exercise, different weight/reps appends to same exercise', () => {
  let workout = {
    exercises: [
      { id: 'ex_1', exerciseName: 'Bench Press', sets: [{ setNumber: 1, weight: 40, reps: 10 }] }
    ]
  };

  // Next set: 45 kg x 8 reps
  const idx = findMatchingExerciseIndex(workout.exercises, 'Bench Press');
  assert.strictEqual(idx, 0);
  const nextSet = workout.exercises[idx].sets.length + 1;
  workout.exercises[idx].sets.push({ setNumber: nextSet, weight: 45, reps: 8 });

  assert.strictEqual(workout.exercises.length, 1);
  assert.strictEqual(workout.exercises[0].sets[1].weight, 45);
  assert.strictEqual(workout.exercises[0].sets[1].reps, 8);
  assert.strictEqual(workout.exercises[0].sets[1].setNumber, 2);
});

// 9. Scenario D: Different exercise creates new entry starting at Set 1
test('Scenario D: Different exercise creates new entry starting at Set 1', () => {
  let workout = {
    exercises: [
      { id: 'ex_1', exerciseName: 'Bench Press', sets: [{ setNumber: 1, weight: 40, reps: 10 }] }
    ]
  };

  const incomingExercise = 'Shoulder Press';
  const idx = findMatchingExerciseIndex(workout.exercises, incomingExercise);
  assert.strictEqual(idx, -1, 'Shoulder press does not match Bench Press');

  workout.exercises.push({
    id: 'ex_2',
    exerciseName: incomingExercise,
    sets: [{ setNumber: 1, weight: 20, reps: 12 }]
  });

  assert.strictEqual(workout.exercises.length, 2);
  assert.strictEqual(workout.exercises[1].exerciseName, 'Shoulder Press');
  assert.strictEqual(workout.exercises[1].sets[0].setNumber, 1);
});

// 10. Scenario E: Renaming an exercise merges into existing movement
test('Scenario E: Renaming merges into existing exercise and renumbers sets', () => {
  let workout = {
    exercises: [
      { id: 'ex_1', exerciseName: 'Bench Press', sets: [{ setNumber: 1, weight: 40, reps: 10 }] },
      { id: 'ex_2', exerciseName: 'Chest Press', sets: [{ setNumber: 1, weight: 45, reps: 8 }] }
    ]
  };

  // Athlete renames ex_2 ('Chest Press') to 'Bench Press'
  const exIndex = 1;
  const newName = 'Bench Press';
  const destinationIdx = workout.exercises.findIndex(
    (ex, idx) => idx !== exIndex && areExercisesMatching(ex.exerciseName, newName)
  );
  assert.strictEqual(destinationIdx, 0, 'Matches Bench Press at index 0');

  const destinationEx = workout.exercises[destinationIdx];
  const targetEx = workout.exercises[exIndex];
  const startSetNum = destinationEx.sets.length + 1;

  const mergedSets = [
    ...destinationEx.sets,
    ...targetEx.sets.map((s, idx) => ({ ...s, setNumber: startSetNum + idx }))
  ];

  workout.exercises = workout.exercises
    .filter((_, idx) => idx !== exIndex)
    .map((ex) => (ex.id === destinationEx.id ? { ...ex, sets: mergedSets } : ex));

  assert.strictEqual(workout.exercises.length, 1, 'Duplicate removed');
  assert.strictEqual(workout.exercises[0].exerciseName, 'Bench Press');
  assert.strictEqual(workout.exercises[0].sets.length, 2, 'Sets merged');
  assert.strictEqual(workout.exercises[0].sets[0].setNumber, 1);
  assert.strictEqual(workout.exercises[0].sets[1].setNumber, 2);
  assert.strictEqual(workout.exercises[0].sets[1].weight, 45);
});

console.log('-----------------------------------------------------');
console.log(`TEST SUMMARY: ${passed} PASSED, 0 FAILED`);
console.log('-----------------------------------------------------');
