/**
 * Comprehensive Verification for Confirmation and Correction Flow
 * Tests:
 * 1. Path A: Confirming "Barbell Rowing" via button click ('CONFIRM') or voice ("yes" / candidate name)
 * 2. Path B: Selecting/typing replacement exercise preserves reps and weight
 * 3. Path C: Specifying custom weight via button or voice preserves exercise and reps
 */

import { evaluateClarificationNeed, processClarificationResponse } from '../src/lib/voice/clarificationStateMachine';

console.log('=====================================================');
console.log('VERIFYING VOICE CONFIRMATION AND CORRECTION FLOW');
console.log('=====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testId: string, description: string) {
  if (condition) {
    console.log(`  ✓ PASS: [${testId}] ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: [${testId}] ${description}`);
    failed++;
  }
}

// ----------------------------------------------------------------------
// 1. Path A: Exercise Confirmation ("Barbell Rowing")
// ----------------------------------------------------------------------
const confirmState = evaluateClarificationNeed({
  rawTranscript: 'barbell rowing 40 kg 10 reps',
  detectedUnknownExercise: 'barbell rowing',
  parsedWeight: 40,
  parsedReps: 10,
  currentWorkout: null,
  selectedExerciseId: null,
  preferredUnit: 'kg',
});

assert(
  confirmState !== null && confirmState.step === 'CONFIRM_EXERCISE',
  'PATH-A-1',
  'evaluateClarificationNeed prompts CONFIRM_EXERCISE for "barbell rowing"'
);

if (confirmState) {
  // A. Simulate button click "Yes, log it" (passing 'yes' as resolved in handleClarificationOption)
  const clickRes = processClarificationResponse(confirmState, 'yes', 'kg');
  assert(
    clickRes.completedCommand !== undefined &&
      clickRes.completedCommand.type === 'ADD_SET' &&
      clickRes.completedCommand.exercise === 'Barbell Rowing' &&
      clickRes.completedCommand.weight === 40 &&
      clickRes.completedCommand.reps === 10,
    'PATH-A-2',
    'Clicking "Yes, log it" successfully registers Barbell Rowing with 40 kg × 10 reps'
  );

  // B. Simulate candidate name repetition as confirmation
  const voiceNameRes = processClarificationResponse(confirmState, 'Barbell Rowing', 'kg');
  assert(
    voiceNameRes.completedCommand !== undefined &&
      voiceNameRes.completedCommand.exercise === 'Barbell Rowing' &&
      voiceNameRes.completedCommand.weight === 40,
    'PATH-A-3',
    'Repeating candidate name "Barbell Rowing" affirmatively resolves confirmation'
  );

  // C. Simulate spoken "yes" or "yeah"
  const voiceYesRes = processClarificationResponse(confirmState, 'yeah', 'kg');
  assert(
    voiceYesRes.completedCommand !== undefined &&
      voiceYesRes.completedCommand.exercise === 'Barbell Rowing',
    'PATH-A-4',
    'Spoken "yeah" affirmatively resolves confirmation'
  );
}

// ----------------------------------------------------------------------
// 2. Path B: "Choose another exercise"
// ----------------------------------------------------------------------
if (confirmState) {
  // A. Options include "Choose another exercise"
  const chooseOption = confirmState.options.find((o) => o.label.toLowerCase().includes('another exercise'));
  assert(
    chooseOption !== undefined && chooseOption.action === 'REJECT',
    'PATH-B-1',
    'Options include "Choose another exercise" with action REJECT'
  );

  // B. Voice correction with "No, Barbell Row"
  const voiceCorrectionRes = processClarificationResponse(confirmState, 'No, Barbell Row', 'kg');
  assert(
    voiceCorrectionRes.completedCommand !== undefined &&
      voiceCorrectionRes.completedCommand.exercise === 'Barbell Row' &&
      voiceCorrectionRes.completedCommand.weight === 40 &&
      voiceCorrectionRes.completedCommand.reps === 10,
    'PATH-B-2',
    'Spoken "No, Barbell Row" replaces exercise while preserving 40 kg and 10 reps'
  );

  // C. Voice correction with "I meant Incline Bench"
  const voiceMeantRes = processClarificationResponse(confirmState, 'I meant Incline Bench', 'kg');
  assert(
    voiceMeantRes.completedCommand !== undefined &&
      voiceMeantRes.completedCommand.exercise === 'Incline Bench' &&
      voiceMeantRes.completedCommand.weight === 40,
    'PATH-B-3',
    'Spoken "I meant Incline Bench" replaces exercise with preserved fields'
  );
}

// ----------------------------------------------------------------------
// 3. Path C: "Say another weight"
// ----------------------------------------------------------------------
const weightPromptState = evaluateClarificationNeed({
  rawTranscript: 'bench press 10 reps',
  detectedExercise: 'Bench Press',
  parsedReps: 10,
  currentWorkout: null,
  selectedExerciseId: null,
  preferredUnit: 'kg',
});

assert(
  weightPromptState !== null && weightPromptState.step === 'ASK_WEIGHT',
  'PATH-C-1',
  'evaluateClarificationNeed prompts ASK_WEIGHT when weight is missing'
);

if (weightPromptState) {
  // A. Option contains "Say another weight"
  const sayWeightOpt = weightPromptState.options.find((o) => o.label === 'Say another weight');
  assert(
    sayWeightOpt !== undefined && sayWeightOpt.action === 'CORRECT',
    'PATH-C-2',
    'Options include "Say another weight" with action CORRECT'
  );

  // B. Providing custom weight via voice: "50 kg"
  const voiceWeightRes = processClarificationResponse(weightPromptState, '50 kg', 'kg');
  assert(
    voiceWeightRes.completedCommand !== undefined &&
      voiceWeightRes.completedCommand.type === 'ADD_SET' &&
      voiceWeightRes.completedCommand.exercise === 'Bench Press' &&
      voiceWeightRes.completedCommand.weight === 50 &&
      voiceWeightRes.completedCommand.reps === 10,
    'PATH-C-3',
    'Spoken "50 kg" completes set with Bench Press: 50 kg × 10 reps'
  );

  // C. Providing standalone numeric weight: "55"
  const voiceNumRes = processClarificationResponse(weightPromptState, '55', 'kg');
  assert(
    voiceNumRes.completedCommand !== undefined &&
      voiceNumRes.completedCommand.weight === 55 &&
      voiceNumRes.completedCommand.reps === 10,
    'PATH-C-4',
    'Spoken "55" completes set with Bench Press: 55 kg × 10 reps'
  );
}

console.log('\n-----------------------------------------------------');
console.log(`CONFIRMATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('-----------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
}
