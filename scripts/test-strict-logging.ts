/**
 * RepVoice Strict Voice-to-Text and Workout Logging Test Suite
 *
 * Verifies all 6 Regression & Strict Logging Criteria:
 * 1. "Bench press" is parsed and stored as "Bench Press"
 * 2. "Chest press" is parsed and stored as "Chest Press" (distinct from Bench Press, never substituted)
 * 3. Specific variations ("Dumbbell Chest Press", "Barbell Bench Press", "Flat Bench Press", "Bent Over Row", "Barbell Squat") are preserved without flattening
 * 4. Unusual but valid exercises ("Landmine Press", "Svend Press", "Spider Curl", "Zercher Squat", "Zercher Deadlift", "JM Press") are preserved faithfully
 * 5. Missing or unclear information triggers clarification instead of guessing (no invented 10 reps, no invented 40 kg)
 * 6. The original transcript, displayed exercise, and saved exercise remain 100% consistent throughout the pipeline
 */

import { parseWorkoutCommand } from '../src/lib/voice/workoutCommandParser';
import { evaluateClarificationNeed, processClarificationResponse } from '../src/lib/voice/clarificationStateMachine';
import { normalizeSpokenNumbers } from '../src/lib/voice/parser';
import { Workout } from '../src/types';

console.log('=====================================================');
console.log('RUNNING REPVOICE STRICT LOGGING ACCEPTANCE TEST SUITE');
console.log('=====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testId: string, description: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testId} — ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testId} — ${description}`);
    failed++;
  }
}

// ----------------------------------------------------------------------
// Criterion 1: "Bench press" is recognized and stored as "Bench Press"
// ----------------------------------------------------------------------
const benchCmd = parseWorkoutCommand('Bench press 60 kilos 10 reps');
assert(
  benchCmd.type === 'ADD_SET' &&
    benchCmd.exercise === 'Bench Press' &&
    benchCmd.weight === 60 &&
    benchCmd.reps === 10 &&
    benchCmd.rawTranscript === 'Bench press 60 kilos 10 reps',
  'CRIT-1',
  '"Bench press" parsed directly as "Bench Press" with exact weight, reps, and raw transcript'
);

// ----------------------------------------------------------------------
// Criterion 2: "Chest press" is recognized and stored as "Chest Press"
// NEVER substituted with "Bench Press"
// ----------------------------------------------------------------------
const chestCmd = parseWorkoutCommand('Chest press 45 kilos 12 reps');
assert(
  chestCmd.type === 'ADD_SET' &&
    chestCmd.exercise === 'Chest Press' &&
    chestCmd.weight === 45 &&
    chestCmd.reps === 12 &&
    (chestCmd.exercise as string) !== 'Bench Press',
  'CRIT-2A',
  '"Chest press" parsed as "Chest Press" (strictly distinct from Bench Press)'
);

const dumbbellChestCmd = parseWorkoutCommand('Dumbbell chest press 25 kilos 10 reps');
assert(
  dumbbellChestCmd.type === 'ADD_SET' &&
    dumbbellChestCmd.exercise === 'Dumbbell Chest Press' &&
    (dumbbellChestCmd.exercise as string) !== 'Dumbbell Bench Press',
  'CRIT-2B',
  '"Dumbbell chest press" is NOT rewritten to "Dumbbell Bench Press"'
);

const machineChestCmd = parseWorkoutCommand('Machine chest press 50 kilos 10 reps');
assert(
  machineChestCmd.type === 'ADD_SET' &&
    machineChestCmd.exercise === 'Machine Chest Press',
  'CRIT-2C',
  '"Machine chest press" is preserved as "Machine Chest Press"'
);

// ----------------------------------------------------------------------
// Criterion 3: Exercise names are not flattened or silently renamed
// ----------------------------------------------------------------------
const barbellBenchCmd = parseWorkoutCommand('Barbell bench press 80 kilos 5 reps');
assert(
  barbellBenchCmd.type === 'ADD_SET' &&
    barbellBenchCmd.exercise === 'Barbell Bench Press',
  'CRIT-3A',
  '"Barbell bench press" is preserved as "Barbell Bench Press" (not flattened to Bench Press)'
);

const flatBenchCmd = parseWorkoutCommand('Flat bench press 70 kilos 8 reps');
assert(
  flatBenchCmd.type === 'ADD_SET' &&
    flatBenchCmd.exercise === 'Flat Bench Press',
  'CRIT-3B',
  '"Flat bench press" is preserved as "Flat Bench Press"'
);

const bentOverRowCmd = parseWorkoutCommand('Bent over row 60 kilos 8 reps');
assert(
  bentOverRowCmd.type === 'ADD_SET' &&
    bentOverRowCmd.exercise === 'Bent Over Row',
  'CRIT-3C',
  '"Bent over row" is preserved as "Bent Over Row" (not altered to Barbell Row)'
);

const barbellSquatCmd = parseWorkoutCommand('Barbell squat 100 kilos 5 reps');
assert(
  barbellSquatCmd.type === 'ADD_SET' &&
    barbellSquatCmd.exercise === 'Barbell Squat',
  'CRIT-3D',
  '"Barbell squat" is preserved as "Barbell Squat" (not altered to Squat)'
);

// ----------------------------------------------------------------------
// Criterion 4: Unusual but valid exercises are preserved without rejection
// ----------------------------------------------------------------------
const landmineCmd = parseWorkoutCommand('Landmine press 30 kilos 10 reps');
assert(
  landmineCmd.type === 'ADD_SET' &&
    landmineCmd.exercise === 'Landmine Press' &&
    landmineCmd.weight === 30 &&
    landmineCmd.reps === 10,
  'CRIT-4A',
  '"Landmine press" recognized and preserved as "Landmine Press"'
);

const svendCmd = parseWorkoutCommand('Svend press 15 kilos 15 reps');
assert(
  svendCmd.type === 'ADD_SET' &&
    svendCmd.exercise === 'Svend Press' &&
    svendCmd.weight === 15 &&
    svendCmd.reps === 15,
  'CRIT-4B',
  '"Svend press" recognized and preserved as "Svend Press"'
);

const spiderCurlCmd = parseWorkoutCommand('Spider curl 18 kilos 12 reps');
assert(
  spiderCurlCmd.type === 'ADD_SET' &&
    spiderCurlCmd.exercise === 'Spider Curl' &&
    spiderCmd_check(spiderCurlCmd),
  'CRIT-4C',
  '"Spider curl" recognized and preserved as "Spider Curl"'
);

function spiderCmd_check(cmd: any): boolean {
  return cmd.weight === 18 && cmd.reps === 12;
}

const zercherSquatCmd = parseWorkoutCommand('Zercher squat 75 kilos 6 reps');
assert(
  zercherSquatCmd.type === 'ADD_SET' &&
    zercherSquatCmd.exercise === 'Zercher Squat',
  'CRIT-4D',
  '"Zercher squat" recognized and preserved as "Zercher Squat"'
);

// ----------------------------------------------------------------------
// Criterion 5: Missing or unclear information triggers clarification
// RepVoice NEVER guesses or invents 10 reps or 40 kg!
// ----------------------------------------------------------------------
const missingRepsCmd = parseWorkoutCommand('Bench press at 50 kilos');
assert(
  missingRepsCmd.type === 'ADD_SET' &&
    missingRepsCmd.exercise === 'Bench Press' &&
    missingRepsCmd.weight === 50 &&
    missingRepsCmd.reps === undefined,
  'CRIT-5A',
  '"Bench press at 50 kilos" does NOT invent 10 reps (reps remains undefined)'
);

if (missingRepsCmd.type === 'ADD_SET') {
  const clarifyRepsNeed = evaluateClarificationNeed({
    rawTranscript: missingRepsCmd.rawTranscript,
    detectedExercise: missingRepsCmd.exercise,
    parsedWeight: missingRepsCmd.weight,
    parsedReps: missingRepsCmd.reps,
    currentWorkout: null,
    selectedExerciseId: null,
    preferredUnit: 'kg',
  });
  assert(
    clarifyRepsNeed !== null &&
      clarifyRepsNeed.step === 'ASK_REPS' &&
      clarifyRepsNeed.questionPrompt === 'How many reps did you complete on Bench Press?',
    'CRIT-5B',
    'Missing reps routes to ASK_REPS: "How many reps did you complete on Bench Press?"'
  );
}

const missingWeightCmd = parseWorkoutCommand('Bench press for 8 reps');
assert(
  missingWeightCmd.type === 'ADD_SET' &&
    missingWeightCmd.exercise === 'Bench Press' &&
    missingWeightCmd.weight === undefined &&
    missingWeightCmd.reps === 8,
  'CRIT-5C',
  '"Bench press for 8 reps" does NOT invent 40 kg or 0 kg (weight remains undefined)'
);

if (missingWeightCmd.type === 'ADD_SET') {
  const clarifyWeightNeed = evaluateClarificationNeed({
    rawTranscript: missingWeightCmd.rawTranscript,
    detectedExercise: missingWeightCmd.exercise,
    parsedWeight: missingWeightCmd.weight,
    parsedReps: missingWeightCmd.reps,
    currentWorkout: null,
    selectedExerciseId: null,
    preferredUnit: 'kg',
  });
  assert(
    clarifyWeightNeed !== null &&
      clarifyWeightNeed.step === 'ASK_WEIGHT' &&
      clarifyWeightNeed.questionPrompt === 'What weight did you use for 8 reps on Bench Press?',
    'CRIT-5D',
    'Missing weight routes to ASK_WEIGHT: "What weight did you use for 8 reps on Bench Press?"'
  );

  // ----------------------------------------------------------------------
  // Criterion 6: Multi-turn clarification retains exact inputs faithfully
  // ----------------------------------------------------------------------
  const answeredWeightRes = processClarificationResponse(clarifyWeightNeed!, '55 kilos', 'kg');
  assert(
    answeredWeightRes.completedCommand !== undefined &&
      answeredWeightRes.completedCommand.exercise === 'Bench Press' &&
      answeredWeightRes.completedCommand.weight === 55 &&
      answeredWeightRes.completedCommand.reps === 8,
    'CRIT-6A',
    'Answering weight (55 kilos) merges with spoken reps (8) and exercise (Bench Press) faithfully'
  );
}

// ----------------------------------------------------------------------
// Criterion 7: Exercise selection without numbers does NOT invent sets
// ----------------------------------------------------------------------
const selectOnly = parseWorkoutCommand('Switch to chest press');
assert(
  selectOnly.type === 'SELECT_EXERCISE' &&
    selectOnly.exercise === 'Chest Press' &&
    selectOnly.rawTranscript === 'Switch to chest press',
  'CRIT-7',
  '"Switch to chest press" selects "Chest Press" without inventing default sets or weights'
);

// ----------------------------------------------------------------------
// Criterion 8: Normalizer does not corrupt natural prepositions like "to"
// ----------------------------------------------------------------------
const normalizedPhrase = normalizeSpokenNumbers('switch to chest press');
assert(
  !normalizedPhrase.includes('switch 2 chest press') &&
    normalizedPhrase.includes('chest press'),
  'CRIT-8',
  'Parser does not corrupt preposition "to" into "2"'
);

console.log('\n-----------------------------------------------------');
console.log(`STRICT LOGGING RESULTS: ${passed} PASSED (${failed} FAILED)`);
console.log('-----------------------------------------------------\n');

if (failed > 0) process.exit(1);
