import { parseWorkoutCommand } from '../src/lib/voice/workoutCommandParser';

const testPhrases = [
  'bench press 10 reps 50 kg',
  'curls 15 kg 12 reps',
  'push ups 20 reps',
  'pushups 20 reps',
  'tricep pushdown 30 kg 12 reps',
  'tricep extension 25 kg 10 reps',
  'leg press 150 kg 10 reps',
  'calf raise 50 kg 15 reps',
  'lateral raises 10 kg 12 reps',
  'shoulder press 40 kg 10 reps',
  'pullups 10 reps',
  'incline press 30 kg 8 reps',
  'chest press 50 kg 10 reps',
  'bench press 10 reps at 40 kilos',
  'bench press 40 kg 10 reps'
];

for (const p of testPhrases) {
  const res = parseWorkoutCommand(p, undefined, 0, 'kg');
  console.log(`"${p}" => type: ${res.type}, exercise: ${(res as any).exercise || (res as any).suggestedExercise || ''}, weight: ${(res as any).weight}, reps: ${(res as any).reps}`);
}
