import { evaluateClarificationNeed } from '../src/lib/voice/clarificationStateMachine';
import { parseWorkoutCommand } from '../src/lib/voice/workoutCommandParser';
import { Workout } from '../src/types';

const scenarios = [
  'bench press',
  'bench press 10 reps',
  'bench press 40 kg 10 reps',
  'bench press, 40 kilos, 10 reps',
  '10 reps 40 kilos',
  '40 kilos 10 reps',
  '10 reps',
  '40 kilos',
  'chest press 50 kg 10 reps',
  'squats 100 kg 5 reps',
  'bicep curls 15 kg 10 reps',
  'lat pulldown 50 kg 10 reps',
];

console.log('--- SCENARIO 1: Empty workout ---');
const emptyWorkout: Workout = {
  id: 'w_1',
  title: 'Voice Workout',
  startedAt: new Date().toISOString(),
  exercises: [],
};

for (const phrase of scenarios) {
  const cmd = parseWorkoutCommand(phrase, undefined, 0, 'kg');
  const need = evaluateClarificationNeed({
    rawTranscript: phrase,
    detectedExercise: cmd.type === 'ADD_SET' ? cmd.exercise : undefined,
    detectedUnknownExercise: cmd.type === 'CONFIRM_EXERCISE' ? cmd.spokenPhrase : undefined,
    parsedWeight: 'weight' in cmd ? cmd.weight : undefined,
    parsedReps: 'reps' in cmd ? cmd.reps : undefined,
    parsedSetNumber: 'setNumber' in cmd ? cmd.setNumber : undefined,
    unit: 'kg',
    currentWorkout: emptyWorkout,
    selectedExerciseId: null,
    preferredUnit: 'kg',
  });

  console.log(`"${phrase}"`);
  console.log(`  cmd.type: ${cmd.type}`);
  console.log(`  clarificationNeed: ${need ? `${need.step} -> ${need.questionPrompt}` : 'NONE (executes directly)'}`);
}

console.log('\n--- SCENARIO 2: Workout with Bench Press (1 completed set) ---');
const workoutWithBench: Workout = {
  id: 'w_2',
  title: 'Voice Workout',
  startedAt: new Date().toISOString(),
  exercises: [
    {
      id: 'ex_1',
      exerciseName: 'Bench Press',
      sets: [
        {
          id: 's_1',
          setNumber: 1,
          weight: 40,
          reps: 10,
          unit: 'kg',
          isCompleted: true,
        },
      ],
    },
  ],
};

for (const phrase of scenarios) {
  const cmd = parseWorkoutCommand(phrase, 'Bench Press', 40, 'kg');
  const need = evaluateClarificationNeed({
    rawTranscript: phrase,
    detectedExercise: cmd.type === 'ADD_SET' ? cmd.exercise : cmd.type === 'ADD_SET_CURRENT' ? 'Bench Press' : undefined,
    detectedUnknownExercise: cmd.type === 'CONFIRM_EXERCISE' ? cmd.spokenPhrase : undefined,
    parsedWeight: 'weight' in cmd ? cmd.weight : undefined,
    parsedReps: 'reps' in cmd ? cmd.reps : undefined,
    parsedSetNumber: 'setNumber' in cmd ? cmd.setNumber : undefined,
    unit: 'kg',
    currentWorkout: workoutWithBench,
    selectedExerciseId: 'ex_1',
    preferredUnit: 'kg',
  });

  console.log(`"${phrase}"`);
  console.log(`  cmd.type: ${cmd.type}`);
  console.log(`  clarificationNeed: ${need ? `${need.step} -> ${need.questionPrompt}` : 'NONE (executes directly)'}`);
}
