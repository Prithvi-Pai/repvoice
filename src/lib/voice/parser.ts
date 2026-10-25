import { ParsedVoiceEntry, ParsedSet, WeightUnit } from '@/types';

// Common exercises for fuzzy matching and normalization (sorted longest to shortest)
export const COMMON_EXERCISES = [
  'Incline Dumbbell Bench Press',
  'Incline Barbell Bench Press',
  'Flat Dumbbell Bench Press',
  'Dumbbell Bench Press',
  'Incline Bench Press',
  'Decline Bench Press',
  'Close Grip Bench Press',
  'Bench Press',
  'Romanian Deadlift',
  'Sumo Deadlift',
  'Trap Bar Deadlift',
  'Deadlift',
  'Bulgarian Split Squats',
  'Front Squat',
  'Hack Squat',
  'Goblet Squat',
  'Squat',
  'Overhead Press',
  'Seated Dumbbell Shoulder Press',
  'Shoulder Press',
  'Military Press',
  'Arnold Press',
  'Barbell Row',
  'Dumbbell Row',
  'Cable Row',
  'Seated Cable Row',
  'T-Bar Row',
  'Lat Pulldown',
  'Pull Ups',
  'Chin Ups',
  'Dips',
  'Incline Dumbbell Curls',
  'Preacher Curls',
  'Hammer Curls',
  'Bicep Curls',
  'Tricep Pushdown',
  'Tricep Extension',
  'Skull Crushers',
  'Overhead Tricep Extension',
  'Leg Press',
  'Lying Leg Curl',
  'Seated Leg Curl',
  'Leg Curl',
  'Leg Extension',
  'Calf Raises',
  'Lateral Raises',
  'Dumbbell Lateral Raises',
  'Front Raises',
  'Face Pulls',
  'Pec Deck',
  'Chest Flyes',
  'Cable Crossover',
  'Push Ups',
  'Shrugs',
  'Lunges',
  'Walking Lunges',
  'Plank',
  'Russian Twists',
  'Hanging Leg Raises'
];

/**
 * Normalizes numbers spoken as words (e.g., "forty" -> 40, "ten" -> 10, "one hundred twenty" -> 120)
 */
export function normalizeSpokenNumbers(text: string): string {
  const numberWords: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90, hundred: 100
  };

  let lower = text.toLowerCase()
    .replace(/\bto\b/g, '2')
    .replace(/\btoo\b/g, '2')
    .replace(/\bfor\b/g, 'for')
    .replace(/\bat\b/g, 'at');

  // Handle "one hundred and X" or "one hundred X"
  lower = lower.replace(/\bone\s+hundred(?:\s+and)?\s+(\w+)\b/g, (_, ones) => {
    const val = numberWords[ones];
    return val ? String(100 + val) : '100 ' + ones;
  });

  // Replace compound like "forty five" or "forty-five"
  for (const [tens, tVal] of Object.entries({
    twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90
  })) {
    for (const [ones, oVal] of Object.entries({
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9
    })) {
      const compound = `${tens} ${ones}`;
      if (lower.includes(compound)) {
        lower = lower.replaceAll(compound, String(tVal + oVal));
      }
      const hyphenated = `${tens}-${ones}`;
      if (lower.includes(hyphenated)) {
        lower = lower.replaceAll(hyphenated, String(tVal + oVal));
      }
    }
  }

  // Single number words
  for (const [word, val] of Object.entries(numberWords)) {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    lower = lower.replace(reg, String(val));
  }

  return lower;
}

/**
 * Extracts exercise name, weights, and reps from natural gym voice speech.
 * Handles diverse phrasings:
 * - "Bench press 60 kg 10 reps"
 * - "Bench press 60 by 10"
 * - "Squat 100 5, then 110 5"
 * - "3 sets of 10 with 50 kilos"
 * - "Same weight 8 reps"
 */
export function parseVoiceInput(
  rawTranscript: string,
  contextExercise?: string,
  lastWeight: number = 0,
  defaultUnit: WeightUnit = 'kg'
): ParsedVoiceEntry {
  if (!rawTranscript || !rawTranscript.trim()) {
    return {
      exercise: contextExercise || 'Workout Exercise',
      sets: [
        {
          weight: lastWeight || 40,
          reps: 10,
          unit: defaultUnit,
        },
      ],
      rawTranscript: '',
      confidence: 'low',
    };
  }

  let cleaned = normalizeSpokenNumbers(rawTranscript.trim());

  // Determine unit
  let unit: WeightUnit = defaultUnit;
  if (/\b(?:lbs|pounds?)\b/i.test(cleaned)) {
    unit = 'lbs';
  } else if (/\b(?:kg|kilos?|kilograms?)\b/i.test(cleaned)) {
    unit = 'kg';
  }

  // 1. Detect Exercise Name
  let exerciseName = '';
  const sortedExercises = [...COMMON_EXERCISES].sort((a, b) => b.length - a.length);

  for (const known of sortedExercises) {
    const regex = new RegExp(`\\b${known}s?\\b`, 'i');
    if (regex.test(cleaned)) {
      exerciseName = known;
      cleaned = cleaned.replace(regex, '');
      break;
    }
  }

  // If no common exercise detected in speech, check context or text before numbers
  if (!exerciseName) {
    // Check if there is text before numbers
    const matchBeforeNumber = cleaned.match(/^([a-zA-Z\s]+?)(?=\b\d|\bsame\b|\bbodyweight\b)/i);
    if (matchBeforeNumber && matchBeforeNumber[1].trim().length > 2) {
      const candidate = matchBeforeNumber[1].trim();
      // Avoid words like "did", "set", "reps", "completed" as exercise names
      if (!/^(?:did|done|set|sets|reps|completed|workout|just)$/i.test(candidate)) {
        exerciseName = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        cleaned = cleaned.slice(matchBeforeNumber[0].length);
      }
    }
  }

  if (!exerciseName) {
    exerciseName = contextExercise || 'Workout Exercise';
  }

  // 2. Parse Segments (sets)
  // Split by "then", "and then", periods, commas, semicolons, "next"
  const rawSegments = cleaned
    .split(/\.|\band then\b|\bthen\b|\bnext\b|;|,/gi)
    .map((s) => s.trim())
    .filter(Boolean);

  const parsedSets: ParsedSet[] = [];
  let currentWeight = lastWeight;

  for (const seg of rawSegments) {
    // Pattern 1: "X sets of Y reps at/with Z kg" or "3 sets of 10 at 50"
    const multiSetMatch = seg.match(
      /(\d+)\s*sets?(?:\s*of\s*(\d+))?(?:\s*(?:reps?|repetitions?))?(?:\s*(?:at|with|,)?\s*(\d+(?:\.\d+)?)\s*(?:kg|kilos?|lbs|pounds?)?)?/i
    );
    if (multiSetMatch && multiSetMatch[1] && parseInt(multiSetMatch[1]) > 1) {
      const setCount = parseInt(multiSetMatch[1]);
      const reps = multiSetMatch[2] ? parseInt(multiSetMatch[2]) : 10;
      if (multiSetMatch[3]) currentWeight = parseFloat(multiSetMatch[3]);

      for (let i = 0; i < setCount; i++) {
        parsedSets.push({ weight: currentWeight, reps, unit });
      }
      continue;
    }

    // Pattern 2: "X by Y" or "X x Y" or "X times Y" (e.g. "60 by 10", "100 x 5", "50 times 12")
    const byMatch = seg.match(/(\d+(?:\.\d+)?)\s*(?:by|x|\*|times)\s*(\d+)/i);
    if (byMatch) {
      currentWeight = parseFloat(byMatch[1]);
      const reps = parseInt(byMatch[2], 10);
      parsedSets.push({ weight: currentWeight, reps, unit });
      continue;
    }

    // Pattern 3: Explicit weight and reps: "60 kg for 10 reps" or "60 kilos 10" or "60kg 10 reps"
    const explicitMatch = seg.match(
      /(\d+(?:\.\d+)?)\s*(?:kg|kilos?|lbs|pounds?)\s*(?:for\s*)?(\d+)?(?:\s*reps?)?/i
    );
    if (explicitMatch) {
      currentWeight = parseFloat(explicitMatch[1]);
      const reps = explicitMatch[2] ? parseInt(explicitMatch[2], 10) : 10;
      parsedSets.push({ weight: currentWeight, reps, unit });
      continue;
    }

    // Pattern 4: Two numbers in segment: "60 10" or "60 for 10"
    const twoNumbers = seg.match(/\b(\d+(?:\.\d+)?)\s*(?:for\s*)?(\d+)\b/);
    if (twoNumbers) {
      currentWeight = parseFloat(twoNumbers[1]);
      const reps = parseInt(twoNumbers[2], 10);
      parsedSets.push({ weight: currentWeight, reps, unit });
      continue;
    }

    // Pattern 5: "Same weight" with reps: "same weight 8 reps" or "same for 8"
    const sameWeightMatch = seg.match(/(?:same weight|same)\s*(?:for\s*)?(\d+)?(?:\s*reps?)?/i);
    if (sameWeightMatch && (sameWeightMatch[1] || currentWeight > 0)) {
      const reps = sameWeightMatch[1] ? parseInt(sameWeightMatch[1], 10) : 10;
      parsedSets.push({ weight: currentWeight, reps, unit });
      continue;
    }

    // Pattern 6: Single number with reps: "12 reps" or "did 8"
    const onlyRepsMatch = seg.match(/(?:did|done|for)?\s*(\d+)\s*(?:reps?|repetitions?)/i);
    if (onlyRepsMatch) {
      const reps = parseInt(onlyRepsMatch[1], 10);
      parsedSets.push({ weight: currentWeight, reps, unit });
      continue;
    }

    // Pattern 7: Single number with weight: "60 kilos" or "60 kg"
    const onlyWeightMatch = seg.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|lbs|pounds?)/i);
    if (onlyWeightMatch) {
      currentWeight = parseFloat(onlyWeightMatch[1]);
      parsedSets.push({ weight: currentWeight, reps: 10, unit });
      continue;
    }

    // Pattern 8: Lone number: "60"
    const loneNumberMatch = seg.match(/\b(\d+(?:\.\d+)?)\b/);
    if (loneNumberMatch) {
      const num = parseFloat(loneNumberMatch[1]);
      if (num >= 20) {
        // Likely weight
        currentWeight = num;
        parsedSets.push({ weight: currentWeight, reps: 10, unit });
      } else {
        // Likely reps if we have a current weight
        const reps = parseInt(loneNumberMatch[1], 10);
        parsedSets.push({ weight: currentWeight || 0, reps, unit });
      }
      continue;
    }
  }

  // Fallback: If nothing was parsed from segments, provide a safe set with detected numbers
  if (parsedSets.length === 0) {
    const allNumbers = cleaned.match(/\b\d+(\.\d+)?\b/g);
    if (allNumbers && allNumbers.length >= 2) {
      parsedSets.push({
        weight: parseFloat(allNumbers[0]),
        reps: parseInt(allNumbers[1], 10),
        unit,
      });
    } else if (allNumbers && allNumbers.length === 1) {
      const num = parseFloat(allNumbers[0]);
      parsedSets.push({
        weight: num >= 20 ? num : currentWeight,
        reps: num < 20 ? parseInt(allNumbers[0], 10) : 10,
        unit,
      });
    } else {
      parsedSets.push({
        weight: currentWeight || 40,
        reps: 10,
        unit,
      });
    }
  }

  return {
    exercise: exerciseName.trim(),
    sets: parsedSets,
    rawTranscript,
    confidence: parsedSets.length > 0 && exerciseName ? 'high' : 'medium',
  };
}
