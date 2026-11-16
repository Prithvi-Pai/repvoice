import {
  WorkoutVoiceCommand,
  WeightUnit,
  ParsedSet,
  PendingExerciseConfirmation,
} from '../../types';
import { toTitleCase } from '../exercises/exerciseStore';

/**
 * Common exercise aliases mapping spoken forms to canonical exercise names.
 * Covers variations, common abbreviations, and singular/plural forms.
 */
export const EXERCISE_ALIASES: Record<string, string> = {
  // Incline bench press
  'incline dumbbell bench press': 'Incline Dumbbell Bench Press',
  'incline dumbbell bench': 'Incline Dumbbell Bench Press',
  'incline dumbbell press': 'Incline Dumbbell Bench Press',
  'incline db bench press': 'Incline Dumbbell Bench Press',
  'incline db bench': 'Incline Dumbbell Bench Press',
  'incline db press': 'Incline Dumbbell Bench Press',
  'incline barbell bench press': 'Incline Barbell Bench Press',
  'incline barbell bench': 'Incline Barbell Bench Press',
  'incline barbell press': 'Incline Barbell Bench Press',
  'incline bench press': 'Incline Bench Press',
  'incline bench': 'Incline Bench Press',
  'incline press': 'Incline Bench Press',

  // Flat & dumbbell bench press
  'flat dumbbell bench press': 'Flat Dumbbell Bench Press',
  'flat dumbbell bench': 'Flat Dumbbell Bench Press',
  'flat dumbbell press': 'Flat Dumbbell Bench Press',
  'flat db bench press': 'Flat Dumbbell Bench Press',
  'flat db bench': 'Flat Dumbbell Bench Press',
  'dumbbell bench press': 'Dumbbell Bench Press',
  'dumbbell bench': 'Dumbbell Bench Press',
  'db bench press': 'Dumbbell Bench Press',
  'db bench': 'Dumbbell Bench Press',
  'decline bench press': 'Decline Bench Press',
  'decline bench': 'Decline Bench Press',
  'close grip bench press': 'Close Grip Bench Press',
  'close grip bench': 'Close Grip Bench Press',
  'barbell bench press': 'Barbell Bench Press',
  'barbell bench': 'Barbell Bench Press',
  'flat barbell bench': 'Barbell Bench Press',
  'flat bench press': 'Flat Bench Press',
  'flat bench': 'Flat Bench Press',
  'bench press': 'Bench Press',
  'bench': 'Bench Press',

  // Chest Press (distinct from Bench Press - preserve exact spoken words)
  'dumbbell chest press': 'Dumbbell Chest Press',
  'dumbbell chest presses': 'Dumbbell Chest Press',
  'machine chest press': 'Machine Chest Press',
  'machine chest presses': 'Machine Chest Press',
  'cable chest press': 'Cable Chest Press',
  'cable chest presses': 'Cable Chest Press',
  'incline chest press': 'Incline Chest Press',
  'seated chest press': 'Seated Chest Press',
  'chest press': 'Chest Press',
  'chest presses': 'Chest Press',
  'floor press': 'Floor Press',
  'pin press': 'Pin Press',

  // Rows
  'dumbbell rows': 'Dumbbell Row',
  'dumbbell row': 'Dumbbell Row',
  'single arm dumbbell row': 'Dumbbell Row',
  'one arm dumbbell row': 'Dumbbell Row',
  'db rows': 'Dumbbell Row',
  'db row': 'Dumbbell Row',
  'barbell rows': 'Barbell Row',
  'barbell row': 'Barbell Row',
  'bent over rows': 'Bent Over Row',
  'bent over row': 'Bent Over Row',
  'pendlay rows': 'Pendlay Row',
  'pendlay row': 'Pendlay Row',
  'bb rows': 'Barbell Row',
  'bb row': 'Barbell Row',
  'seated cable rows': 'Seated Row',
  'seated cable row': 'Seated Row',
  'seated rows': 'Seated Row',
  'seated row': 'Seated Row',
  'cable rows': 'Cable Row',
  'cable row': 'Cable Row',
  't bar rows': 'T-Bar Row',
  't-bar rows': 'T-Bar Row',
  't-bar row': 'T-Bar Row',
  't bar row': 'T-Bar Row',

  // Lat pulldowns & pull ups
  'lat pulldowns': 'Lat Pulldown',
  'lat pulldown': 'Lat Pulldown',
  'lat pull downs': 'Lat Pulldown',
  'lat pull down': 'Lat Pulldown',
  'cable pulldowns': 'Lat Pulldown',
  'cable pulldown': 'Lat Pulldown',
  'pulldowns': 'Lat Pulldown',
  'pulldown': 'Lat Pulldown',
  'pull ups': 'Pull Ups',
  'pull up': 'Pull Ups',
  'pull-ups': 'Pull Ups',
  'pull-up': 'Pull Ups',
  'chin ups': 'Chin Ups',
  'chin up': 'Chin Ups',
  'chin-ups': 'Chin Ups',
  'chin-up': 'Chin Ups',
  'dips': 'Dips',
  'dip': 'Dips',

  // Deadlifts
  'romanian deadlifts': 'Romanian Deadlift',
  'romanian deadlift': 'Romanian Deadlift',
  'rdls': 'Romanian Deadlift',
  'rdl': 'Romanian Deadlift',
  'sumo deadlifts': 'Sumo Deadlift',
  'sumo deadlift': 'Sumo Deadlift',
  'trap bar deadlifts': 'Trap Bar Deadlift',
  'trap bar deadlift': 'Trap Bar Deadlift',
  'hex bar deadlift': 'Trap Bar Deadlift',
  'zercher deadlift': 'Zercher Deadlift',
  'stiff leg deadlift': 'Stiff Leg Deadlift',
  'deadlifts': 'Deadlift',
  'deadlift': 'Deadlift',

  // Squats
  'bulgarian split squats': 'Bulgarian Split Squats',
  'bulgarian split squat': 'Bulgarian Split Squats',
  'split squats': 'Split Squats',
  'split squat': 'Split Squat',
  'front squats': 'Front Squat',
  'front squat': 'Front Squat',
  'hack squats': 'Hack Squat',
  'hack squat': 'Hack Squat',
  'goblet squats': 'Goblet Squat',
  'goblet squat': 'Goblet Squat',
  'zercher squats': 'Zercher Squat',
  'zercher squat': 'Zercher Squat',
  'box squats': 'Box Squat',
  'box squat': 'Box Squat',
  'belt squats': 'Belt Squat',
  'belt squat': 'Belt Squat',
  'barbell squats': 'Barbell Squat',
  'barbell squat': 'Barbell Squat',
  'back squats': 'Back Squat',
  'back squat': 'Back Squat',
  'squats': 'Squat',
  'squat': 'Squat',

  // Shoulders & Presses
  'seated dumbbell shoulder press': 'Seated Dumbbell Shoulder Press',
  'seated dumbbell press': 'Seated Dumbbell Shoulder Press',
  'dumbbell shoulder press': 'Dumbbell Shoulder Press',
  'overhead press': 'Overhead Press',
  'military press': 'Military Press',
  'shoulder press': 'Shoulder Press',
  'arnold press': 'Arnold Press',
  'landmine press': 'Landmine Press',
  'landmine presses': 'Landmine Press',
  'svend press': 'Svend Press',
  'svend presses': 'Svend Press',
  'ohp': 'Overhead Press',
  'lateral raises': 'Lateral Raises',
  'lateral raise': 'Lateral Raises',
  'dumbbell lateral raises': 'Lateral Raises',
  'dumbbell lateral raise': 'Lateral Raises',
  'side lateral raises': 'Lateral Raises',
  'side lateral raise': 'Lateral Raises',
  'side raises': 'Lateral Raises',
  'side raise': 'Lateral Raises',
  'front raises': 'Front Raises',
  'front raise': 'Front Raises',
  'face pulls': 'Face Pulls',
  'face pull': 'Face Pulls',
  'shrugs': 'Shrugs',
  'shrug': 'Shrugs',

  // Arms: Biceps & Triceps
  'spider curls': 'Spider Curl',
  'spider curl': 'Spider Curl',
  'incline dumbbell curls': 'Incline Dumbbell Curls',
  'incline dumbbell curl': 'Incline Dumbbell Curls',
  'preacher curls': 'Preacher Curls',
  'preacher curl': 'Preacher Curls',
  'hammer curls': 'Hammer Curls',
  'hammer curl': 'Hammer Curls',
  'bicep curls': 'Bicep Curls',
  'bicep curl': 'Bicep Curls',
  'biceps curls': 'Bicep Curls',
  'biceps curl': 'Bicep Curls',
  'dumbbell curls': 'Bicep Curls',
  'dumbbell curl': 'Bicep Curls',
  'curls': 'Bicep Curls',
  'curl': 'Bicep Curls',
  'tricep pushdowns': 'Tricep Pushdown',
  'tricep pushdown': 'Tricep Pushdown',
  'cable pushdowns': 'Tricep Pushdown',
  'cable pushdown': 'Tricep Pushdown',
  'triceps pushdown': 'Tricep Pushdown',
  'tricep extensions': 'Tricep Extension',
  'tricep extension': 'Tricep Extension',
  'overhead tricep extension': 'Overhead Tricep Extension',
  'skull crushers': 'Skull Crushers',
  'skull crusher': 'Skull Crushers',
  'jm press': 'JM Press',

  // Legs & Core
  'leg press': 'Leg Press',
  'lying leg curls': 'Lying Leg Curl',
  'lying leg curl': 'Lying Leg Curl',
  'seated leg curls': 'Seated Leg Curl',
  'seated leg curl': 'Seated Leg Curl',
  'leg curls': 'Leg Curl',
  'leg curl': 'Leg Curl',
  'leg extensions': 'Leg Extension',
  'leg extension': 'Leg Extension',
  'calf raises': 'Calf Raises',
  'calf raise': 'Calf Raises',
  'lunges': 'Lunges',
  'lunge': 'Lunges',
  'walking lunges': 'Walking Lunges',
  'walking lunge': 'Walking Lunges',
  'pec deck': 'Pec Deck',
  'peck deck': 'Pec Deck',
  'chest flyes': 'Chest Flyes',
  'chest flies': 'Chest Flyes',
  'chest fly': 'Chest Flyes',
  'incline dumbbell flyes': 'Incline Dumbbell Flyes',
  'incline dumbbell fly': 'Incline Dumbbell Flyes',
  'incline dumbbell flies': 'Incline Dumbbell Flyes',
  'incline flyes': 'Incline Dumbbell Flyes',
  'incline flies': 'Incline Dumbbell Flyes',
  'incline fly': 'Incline Dumbbell Flyes',
  'dumbbell flyes': 'Chest Flyes',
  'dumbbell fly': 'Chest Flyes',
  'dumbbell flies': 'Chest Flyes',
  'cable fly': 'Chest Flyes',
  'cable flies': 'Chest Flyes',
  'pec fly': 'Chest Flyes',
  'pec flies': 'Chest Flyes',
  'flys': 'Chest Flyes',
  'cable crossover': 'Cable Crossover',
  'push ups': 'Push Ups',
  'push up': 'Push Ups',
  'push-ups': 'Push Ups',
  'push-up': 'Push Ups',
  'close grip push ups': 'Close Grip Push Up',
  'close grip push up': 'Close Grip Push Up',
  'plank': 'Plank',
  'russian twists': 'Russian Twists',
  'hanging leg raises': 'Hanging Leg Raises',
  'cable crunches': 'Cable Crunch',
  'cable crunch': 'Cable Crunch',
  'ab crunches': 'Ab Crunch',
  'ab crunch': 'Ab Crunch',

  // Additional High-Frequency Gym Movements
  'cable curls': 'Cable Curl',
  'cable curl': 'Cable Curl',
  'barbell curls': 'Barbell Curl',
  'barbell curl': 'Barbell Curl',
  'ez bar curls': 'EZ Bar Curl',
  'ez bar curl': 'EZ Bar Curl',
  'ez bar bicep curl': 'EZ Bar Curl',
  'ez curls': 'EZ Bar Curl',
  'ez curl': 'EZ Bar Curl',
  'incline hammer curls': 'Incline Hammer Curl',
  'incline hammer curl': 'Incline Hammer Curl',
  'rope pushdown': 'Tricep Pushdown',
  'rope pushdowns': 'Tricep Pushdown',
  'tricep rope pushdown': 'Tricep Pushdown',
  'tricep rope pushdowns': 'Tricep Pushdown',
  'overhead dumbbell extension': 'Overhead Tricep Extension',
  'overhead dumbbell extensions': 'Overhead Tricep Extension',
  'cable lateral raises': 'Lateral Raises',
  'cable lateral raise': 'Lateral Raises',
  'cable side raises': 'Lateral Raises',
  'cable side raise': 'Lateral Raises',
  'reverse pec deck': 'Reverse Pec Deck',
  'rear delt flyes': 'Rear Delt Flyes',
  'rear delt flies': 'Rear Delt Flyes',
  'rear delt fly': 'Rear Delt Flyes',
  'hamstring curls': 'Lying Leg Curl',
  'hamstring curl': 'Lying Leg Curl',
  'quad extensions': 'Leg Extension',
  'quad extension': 'Leg Extension',
  'seated calf raises': 'Calf Raises',
  'seated calf raise': 'Calf Raises',
  'standing calf raises': 'Calf Raises',
  'standing calf raise': 'Calf Raises',
  'hip thrusts': 'Hip Thrust',
  'hip thrust': 'Hip Thrust',
  'barbell hip thrusts': 'Hip Thrust',
  'barbell hip thrust': 'Hip Thrust',
  'glute bridge': 'Glute Bridge',
  'glute bridges': 'Glute Bridge',
  'farmers walk': 'Farmers Walk',
  'farmer walk': 'Farmers Walk',
  'farmers carry': 'Farmers Walk',
};

/**
 * Fast Levenshtein distance calculation for phonetic and typo tolerance
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Normalized string similarity score between 0.0 (unrelated) and 1.0 (exact match)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return 1.0 - dist / maxLen;
}

/**
 * Ordinal word mapping (e.g. second set -> 2)
 */
const ORDINAL_MAP: Record<string, number> = {
  first: 1, '1st': 1,
  second: 2, '2nd': 2,
  third: 3, '3rd': 3,
  fourth: 4, '4th': 4,
  fifth: 5, '5th': 5,
  sixth: 6, '6th': 6,
  seventh: 7, '7th': 7,
  eighth: 8, '8th': 8,
  ninth: 9, '9th': 9,
  tenth: 10, '10th': 10,
};

/**
 * Normalizes numbers spoken as words to numeric digits.
 * Extensively handles lifter slang, compound fractions ("two and a half"),
 * phonetic mishearings ("keys" -> "kilos", "wraps" -> "reps"), and dumbbell pairs ("30s").
 */
export function normalizeSpokenNumbers(text: string): string {
  const numberWords: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90, hundred: 100,
  };

  let str = text.toLowerCase()
    .replace(/kilo['’]?s\b/g, 'kilos')
    .replace(/rep['’]?s\b/g, 'reps')
    .replace(/lb['’]?s\b/g, 'lbs');

  // Fractions & decimals spoken before word-to-digit conversion
  str = str
    .replace(/\b(?:two|2)\s+and\s+a\s+half\b/g, '2.5')
    .replace(/\b(?:three|3)\s+and\s+a\s+half\b/g, '3.5')
    .replace(/\b(?:four|4)\s+and\s+a\s+half\b/g, '4.5')
    .replace(/\b(?:five|5)\s+and\s+a\s+half\b/g, '5.5')
    .replace(/\b(?:six|6)\s+and\s+a\s+half\b/g, '6.5')
    .replace(/\b(?:seven|7)\s+and\s+a\s+half\b/g, '7.5')
    .replace(/\b(?:eight|8)\s+and\s+a\s+half\b/g, '8.5')
    .replace(/\b(?:nine|9)\s+and\s+a\s+half\b/g, '9.5')
    .replace(/\b(?:ten|10)\s+and\s+a\s+half\b/g, '10.5')
    .replace(/\b(?:twelve|12)\s+and\s+a\s+half\b/g, '12.5')
    .replace(/\b(?:fifteen|15)\s+and\s+a\s+half\b/g, '15.5')
    .replace(/\b(?:seventeen|17)\s+and\s+a\s+half\b/g, '17.5')
    .replace(/\b(?:twenty|20)\s+and\s+a\s+half\b/g, '20.5')
    .replace(/\b(?:twenty\s+two|22)\s+and\s+a\s+half\b/g, '22.5')
    .replace(/\b(?:twenty\s+five|25)\s+and\s+a\s+half\b/g, '25.5')
    .replace(/\b(?:one|1)\s+and\s+a\s+quarter\b/g, '1.25')
    .replace(/\b(?:two|2)\s+and\s+a\s+quarter\b/g, '2.25')
    .replace(/\band\s+a\s+half\b/g, '.5')
    .replace(/\bpoint\s+five\b/g, '.5');

  // Hundreds
  str = str.replace(/\bone\s+hundred(?:\s+and)?\s+(\w+)\b/g, (_, ones) => {
    const val = numberWords[ones];
    return val !== undefined ? String(100 + val) : '100 ' + ones;
  });

  // Compound numbers like twenty five -> 25
  for (const [tens, tVal] of Object.entries({
    twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  })) {
    for (const [ones, oVal] of Object.entries({
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9,
    })) {
      const compound = `${tens} ${ones}`;
      if (str.includes(compound)) {
        str = str.replaceAll(compound, String(tVal + oVal));
      }
      const hyphenated = `${tens}-${ones}`;
      if (str.includes(hyphenated)) {
        str = str.replaceAll(hyphenated, String(tVal + oVal));
      }
    }
  }

  // Single number words to digits
  for (const [word, val] of Object.entries(numberWords)) {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    str = str.replace(reg, String(val));
  }

  // Decimal numbers like "7 .5" or "12 .5" or "7 point 5" -> "7.5"
  str = str
    .replace(/(\d+)\s*\.\s*5\b/g, '$1.5')
    .replace(/(\d+)\s+point\s+(\d+)\b/g, '$1.$2');

  // Dumbbell pairs notation: "30s" or "30's" -> "30"
  str = str.replace(/(\d+)\s*['’]?s\b(?!\s*(?:rest|break|timer))/g, '$1');

  // Phonetic unit normalization:
  // "keys", "key", "k" after numbers -> kg
  str = str
    .replace(/\b(\d+(?:\.\d+)?)\s*(?:keys|key)\b/gi, '$1 kg')
    .replace(/\b(\d+(?:\.\d+)?)\s*k\b/gi, '$1 kg')
    .replace(/\b(\d+(?:\.\d+)?)\s*(?:points|bounce)\b/gi, '$1 lbs');

  // Phonetic reps normalization:
  // "wraps", "wrap", "rips", "rip", "raps", "rap" after numbers -> reps
  str = str.replace(/\b(\d+)\s*(?:wraps?|rips?|raps?)\b/gi, '$1 reps');

  // Slang action verbs for reps:
  // "got 10", "hit 10", "crushed 10", "pumped out 10", "banged out 10", "knocked out 10", "managed 8"
  str = str.replace(/\b(?:got|hit|crushed|pumped\s+out|banged\s+out|knocked\s+out|managed)\s+(\d+)\b/gi, 'did $1 reps');

  return str;
}

/**
 * Structured Voice Parsing Pipeline with Learning & Unknown Exercise Confirmation
 * Supports:
 * - Flexible word order (exercise anywhere, sets anywhere, weights anywhere)
 * - Confirmation of unknown exercise names without guessing
 * - Voice responses to confirmation prompts ("Yes", "No, Chest Press", "Not now")
 * - Dynamic custom aliases learned from user confirmations
 */
export function parseWorkoutCommand(
  rawTranscript: string,
  currentExerciseName?: string,
  lastKnownWeight: number = 0,
  defaultUnit: WeightUnit = 'kg',
  customAliases: Record<string, string> = {},
  pendingConfirmation?: PendingExerciseConfirmation | null
): WorkoutVoiceCommand {
  const text = rawTranscript.trim();
  if (!text) {
    return {
      type: 'AMBIGUOUS',
      rawTranscript: '',
      reason: 'No speech recognized',
    };
  }

  // --- Step 1: Preprocessing & Normalization ---
  let working = normalizeSpokenNumbers(text);
  working = working
    .replace(/,/g, ' ')
    .replace(/;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // --- Step 2: Handle Pending Confirmation Voice Responses ---
  if (pendingConfirmation) {
    // A) Dismiss / Skip: "Not now", "Skip", "Cancel", "Later" - check FIRST!
    if (/\b(?:not\s+now|skip|cancel|later|nevermind)\b/i.test(working)) {
      return {
        type: 'RESOLVE_CONFIRMATION',
        action: 'DISMISS',
        rawTranscript: text,
      };
    }

    // B) Confirm: "Yes", "Correct", "Yeah", "Yep", "Confirm", "Log it", "Yes log it"
    if (/\b(?:yes|yep|yeah|correct|confirm|log\s+it|yes\s+log\s+it)\b/i.test(working)) {
      return {
        type: 'RESOLVE_CONFIRMATION',
        action: 'CONFIRM',
        spokenPhrase: pendingConfirmation.spokenPhrase,
        confirmedExercise: pendingConfirmation.suggestedExercise,
        rawTranscript: text,
      };
    }

    // C) Simple Rejection: "No", "Nope", "Wrong", "Not that"
    if (/^(?:no|nope|not\s+that|wrong)$/i.test(working.trim())) {
      return {
        type: 'RESOLVE_CONFIRMATION',
        action: 'REJECT',
        spokenPhrase: pendingConfirmation.spokenPhrase,
        rawTranscript: text,
      };
    }

    // D) Correction: "No, Chest Press", "No it was Bench Press", "Actually Chest Press"
    const correctionMatch = working.match(
      /^(?:no|not\s+that|wrong|actually)\s*,?\s*(?:it\s+was\s+|it's\s+)?([a-zA-Z\s]+)$/i
    );
    if (correctionMatch && correctionMatch[1].trim().length >= 3) {
      const correctedRaw = correctionMatch[1].trim();
      if (!/^(?:no|nope|not|wrong|cancel|skip|now)$/i.test(correctedRaw)) {
        return {
          type: 'RESOLVE_CONFIRMATION',
          action: 'CORRECT',
          spokenPhrase: pendingConfirmation.spokenPhrase,
          confirmedExercise: toTitleCase(correctedRaw),
          rawTranscript: text,
        };
      }
    }
  }

  // --- Step 3: Detect Standalone Control Commands ---
  // A-0) Start workout command (from Home screen)
  if (/^(?:start|begin)\s+(?:a\s+)?(?:workout|session)(?:\s+(.+))?$/i.test(working)) {
    const match = working.match(/^(?:start|begin)\s+(?:a\s+)?(?:workout|session)(?:\s+(.+))?$/i);
    return {
      type: 'START_WORKOUT',
      title: match && match[1] ? toTitleCase(match[1].trim()) : undefined,
      rawTranscript: text,
    };
  }

  // A) Finish workout command
  if (
    /\b(?:finish|end|complete|done|stop)\s+(?:the\s+)?(?:workout|session)\b/i.test(working) ||
    /\b(?:workout|session)\s+(?:is\s+)?(?:done|complete|finished)\b/i.test(working)
  ) {
    return {
      type: 'FINISH_WORKOUT',
      rawTranscript: text,
    };
  }

  // B) Set Done command (standalone without reps/weight logging)
  const isSetDoneCommand =
    /\b(?:set\s+(?:done|finished|complete|completed)|(?:done|finished|completed)\s+(?:with\s+)?(?:the\s+)?set|that\s+was\s+(?:my\s+)?set)\b/i.test(working);
  const hasNumbersOrReps =
    /\b\d+(\.\d+)?\b/.test(working) ||
    /\b(?:reps?|repetitions?|kilos?|kg|lbs?|pounds?|wraps?|rips?)\b/i.test(working);

  if (isSetDoneCommand && !hasNumbersOrReps) {
    return {
      type: 'SET_DONE',
      rawTranscript: text,
    };
  }

  // C) Start set command (activates per-set timer)
  if (/\b(?:start|begin)\s+(?:the\s+)?set\b/i.test(working)) {
    return {
      type: 'START_SET',
      rawTranscript: text,
    };
  }

  // C-2) Rest timer command (e.g. "rest", "rest timer", "rest timer turn on", "turn on rest timer", "start rest", "rest 90 sec", "give me 90 seconds")
  const isRestTimerCommand =
    /^(?:rest|rest\s+timer|take\s+a\s+rest|start\s+rest(?:\s+timer)?|turn\s+on\s+rest(?:\s+timer)?|rest\s+timer\s+turn\s+on|rest\s+timer\s+on|give\s+me\s+(?:a\s+)?rest|set\s+rest(?:\s+to)?|time\s+to\s+rest)(?:\s+(?:for\s+)?(\d+)\s*(?:s|sec|seconds?|min|minutes?)?)?$/i.test(working) ||
    /^(?:turn\s+on|start|begin)\s+(?:the\s+)?rest\s*timer$/i.test(working) ||
    /^(?:give\s+me|take)\s+(\d+)\s*(?:s|sec|seconds?|m|min|minutes?)(?:\s+rest)?$/i.test(working);

  if (isRestTimerCommand) {
    let parsedSeconds: number | undefined;
    const secMatch = working.match(/\b(\d+)\s*(?:s|sec|seconds?)\b/i);
    const minMatch = working.match(/\b(\d+)\s*(?:m|min|minutes?)\b/i);
    if (secMatch) {
      parsedSeconds = parseInt(secMatch[1], 10);
    } else if (minMatch) {
      parsedSeconds = parseInt(minMatch[1], 10) * 60;
    }
    return {
      type: 'START_REST',
      seconds: parsedSeconds,
      rawTranscript: text,
    };
  }

  // D) Undo last entry command
  if (/\b(?:undo|undo\s+that|undo\s+last|revert|undo\s+the\s+last\s+entry)\b/i.test(working)) {
    return {
      type: 'UNDO_LAST',
      rawTranscript: text,
    };
  }

  // E) Modify last set command (e.g. "Change my last set to 35 kilos")
  if (/\b(?:change|modify)\s+(?:my\s+)?last\s+set\b/i.test(working)) {
    const wMatch = working.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|lbs?|pounds?)/i);
    const rMatch = working.match(/(\d+)\s*(?:reps?|repetitions?)/i);
    return {
      type: 'MODIFY_LAST',
      weight: wMatch ? parseFloat(wMatch[1]) : undefined,
      reps: rMatch ? parseInt(rMatch[1], 10) : undefined,
      rawTranscript: text,
    };
  }

  // --- Step 4: Extract Explicit Set Number & Multi-Set Counts ---
  let explicitSetNumber: number | undefined;
  let setCount: number | undefined;
  let isNextSet: boolean = false;

  // 4a. "Next set" or "another set" marker
  if (/\b(?:next|another|one\s+more)\s+set\b/i.test(working)) {
    isNextSet = true;
    working = working.replace(/\b(?:next|another|one\s+more)\s+set\b/gi, ' ');
  }

  // 4b. Explicit ordinal set: e.g. "for my second set", "third set"
  const ordinalSetMatch = working.match(
    /\b(?:my\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\s+set\b/i
  );
  if (ordinalSetMatch) {
    const key = ordinalSetMatch[1].toLowerCase();
    if (ORDINAL_MAP[key]) {
      explicitSetNumber = ORDINAL_MAP[key];
    }
    working = working.replace(ordinalSetMatch[0], ' ');
  }

  // 4c. Explicit numbered set: "set 2", "set #3" (ensure not followed by "reps")
  if (explicitSetNumber === undefined) {
    const numSetMatch = working.match(/\bset\s*#?\s*(\d+)(?!\s*(?:reps?|repetitions?))\b/i);
    if (numSetMatch) {
      explicitSetNumber = parseInt(numSetMatch[1], 10);
      working = working.replace(numSetMatch[0], ' ');
    }
  }

  // 4d. Multi-set count: e.g. "for 3 sets", "3 sets of"
  const multiSetMatch = working.match(/\b(?:for\s+)?(\d+)\s+sets?\b/i);
  if (multiSetMatch) {
    const count = parseInt(multiSetMatch[1], 10);
    if (count > 0) {
      setCount = count;
      working = working.replace(multiSetMatch[0], ' ');
    }
  }

  // --- Step 5: Identify Exercise Anywhere in Sentence ---
  // Combine static dictionary with dynamically learned user aliases
  const allAliasesMap: Record<string, string> = { ...EXERCISE_ALIASES, ...customAliases };
  const sortedAllAliases = Object.keys(allAliasesMap).sort((a, b) => b.length - a.length);

  // Split aliases into multi-word and single-word groups
  // This ensures compound phrases (e.g. "incline dumbell bench") match multi-word movements
  // before a single isolated keyword (e.g. "bench") can accidentally truncate the phrase.
  const multiWordAliases = sortedAllAliases.filter((a) => a.includes(' '));
  const singleWordAliases = sortedAllAliases.filter((a) => !a.includes(' '));

  let detectedExercise: string | undefined;

  // 5a. Exact match on multi-word aliases (e.g. "bench press", "lat pulldown", "incline dumbbell bench")
  for (const alias of multiWordAliases) {
    const regex = new RegExp(`\\b${alias}\\b`, 'i');
    if (regex.test(working)) {
      detectedExercise = allAliasesMap[alias];
      working = working.replace(regex, ' ');
      break;
    }
  }

  // 5b. Multi-word fuzzy matching (phrase length 2 to 4 words)
  // Catches typos and phonetic drops on compound movements (e.g. "incline dumbell bench", "lat puldown", "bench pres")
  if (!detectedExercise) {
    const words = working.split(/\s+/).filter(Boolean);
    let bestScore = 0;
    let bestMatchAlias = '';
    let bestMatchedWords = '';

    for (let len = Math.min(words.length, 4); len >= 2; len--) {
      for (let start = 0; start <= words.length - len; start++) {
        const candidatePhrase = words.slice(start, start + len).join(' ');
        if (
          /^\d+(\.\d+)?$/.test(candidatePhrase) ||
          /^(?:did|done|set|sets|reps|kg|lbs|kilos|pounds|for|at|with|and|the|my)$/i.test(candidatePhrase)
        ) {
          continue;
        }

        for (const alias of multiWordAliases) {
          const sim = stringSimilarity(candidatePhrase, alias);
          if (sim >= 0.84 && sim > bestScore) {
            bestScore = sim;
            bestMatchAlias = alias;
            bestMatchedWords = candidatePhrase;
          }
        }
      }
    }

    if (bestMatchAlias && bestScore >= 0.84) {
      detectedExercise = allAliasesMap[bestMatchAlias];
      working = working.replace(new RegExp(`\\b${bestMatchedWords}\\b`, 'i'), ' ');
    }
  }

  // 5c. Exact match on single-word aliases (e.g. "squat", "bench", "curls", "dips")
  // Only match if not preceded by an unparsed modifier like "incline", "decline", "dumbbell"
  if (!detectedExercise) {
    for (const alias of singleWordAliases) {
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(working)) {
        if (alias === 'bench' && /\b(?:incline|decline|dumbbell|db|close\s*grip)\b/i.test(working)) {
          continue;
        }
        detectedExercise = allAliasesMap[alias];
        working = working.replace(regex, ' ');
        break;
      }
    }
  }

  // 5d. Single-word fuzzy matching
  if (!detectedExercise) {
    const words = working.split(/\s+/).filter(Boolean);
    let bestScore = 0;
    let bestMatchAlias = '';
    let bestMatchedWord = '';

    for (const word of words) {
      if (
        /^\d+(\.\d+)?$/.test(word) ||
        /^(?:did|done|set|sets|reps|kg|lbs|kilos|pounds|for|at|with|and|the|my)$/i.test(word)
      ) {
        continue;
      }
      for (const alias of singleWordAliases) {
        const sim = stringSimilarity(word, alias);
        if (sim >= 0.85 && sim > bestScore) {
          bestScore = sim;
          bestMatchAlias = alias;
          bestMatchedWord = word;
        }
      }
    }

    if (bestMatchAlias && bestScore >= 0.85) {
      detectedExercise = allAliasesMap[bestMatchAlias];
      working = working.replace(new RegExp(`\\b${bestMatchedWord}\\b`, 'i'), ' ');
    }
  }

  // Check prefix forms if exercise not in standard dictionary: "next exercise, [name]", "switch to [name]"
  if (!detectedExercise) {
    const prefixExMatch = working.match(
      /(?:next\s+exercise|switch\s+to|starting|now\s+doing)\s+([a-zA-Z\s]+?)(?=\b\d|\band\b|\bat\b|\bfor\b|$)/i
    );
    if (prefixExMatch && prefixExMatch[1].trim().length > 2) {
      const candidate = prefixExMatch[1].trim();
      if (!/^(?:set|sets|reps|completed|workout|same|done|did)$/i.test(candidate)) {
        detectedExercise = toTitleCase(candidate);
        working = working.replace(prefixExMatch[0], ' ');
      }
    }
  }

  // Clean leftover prepositions
  working = working
    .replace(/\b(?:on|of|for|with|at)\s+(?=\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // --- Step 6: Extract Weight & Unit ---
  let parsedWeight: number | undefined;
  let unit: WeightUnit = defaultUnit;
  let isSameWeight: boolean = false;

  if (/\b(?:same\s+weight|same)\b/i.test(working)) {
    isSameWeight = true;
    working = working.replace(/\b(?:same\s+weight|same)\b/gi, ' ');
  }

  if (/\b(?:bodyweight|body\s+weight)\b/i.test(working)) {
    parsedWeight = 0;
    working = working.replace(/\b(?:bodyweight|body\s+weight)\b/gi, ' ');
  }

  const kgMatch = working.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?)\b/i);
  if (kgMatch) {
    parsedWeight = parseFloat(kgMatch[1]);
    unit = 'kg';
    working = working.replace(kgMatch[0], ' ');
  }

  const lbsMatch = working.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b/i);
  if (lbsMatch) {
    parsedWeight = parseFloat(lbsMatch[1]);
    unit = 'lbs';
    working = working.replace(lbsMatch[0], ' ');
  }

  if (parsedWeight === undefined) {
    const prepWeightMatch = working.match(/\b(?:at|with|using|on)\s+(\d+(?:\.\d+)?)\b/i);
    if (prepWeightMatch) {
      parsedWeight = parseFloat(prepWeightMatch[1]);
      working = working.replace(prepWeightMatch[0], ' ');
    }
  }

  // --- Step 7: Extract Repetitions ---
  let parsedReps: number | undefined;

  const repsMatch = working.match(/(\d+)\s*(?:reps?|repetitions?|wraps?|rips?|raps?)\b/i);
  if (repsMatch) {
    parsedReps = parseInt(repsMatch[1], 10);
    working = working.replace(repsMatch[0], ' ');
  }

  if (parsedReps === undefined) {
    const didMatch = working.match(/\b(?:did|done|completed|for|got|hit|crushed|managed)\s+(\d+)\b/i);
    if (didMatch) {
      parsedReps = parseInt(didMatch[1], 10);
      working = working.replace(didMatch[0], ' ');
    }
  }

  if (parsedWeight === undefined || parsedReps === undefined) {
    const byMatch = working.match(/(\d+(?:\.\d+)?)\s*(?:by|x|\*|times)\s*(\d+)/i);
    if (byMatch) {
      if (parsedWeight === undefined) parsedWeight = parseFloat(byMatch[1]);
      if (parsedReps === undefined) parsedReps = parseInt(byMatch[2], 10);
      working = working.replace(byMatch[0], ' ');
    }
  }

  // --- Step 8: Resolve Remaining Untagged Numbers ---
  const remainingNumbers = (working.match(/\b\d+(\.\d+)?\b/g) || []).map((n) => parseFloat(n));

  if (remainingNumbers.length >= 2 && parsedWeight === undefined && parsedReps === undefined) {
    const [numA, numB] = remainingNumbers;
    if (numA >= 20 && numB <= 20) {
      parsedWeight = numA;
      parsedReps = Math.round(numB);
    } else {
      parsedWeight = numA;
      parsedReps = Math.round(numB);
    }
  } else if (remainingNumbers.length === 1) {
    const single = remainingNumbers[0];
    if (parsedReps === undefined && parsedWeight !== undefined) {
      parsedReps = Math.round(single);
    } else if (parsedWeight === undefined && parsedReps !== undefined) {
      parsedWeight = single;
    } else if (parsedReps === undefined && parsedWeight === undefined) {
      if (single >= 25) {
        parsedWeight = single;
      } else {
        parsedReps = Math.round(single);
      }
    }
  }

  // If setCount was matched (e.g. "10 sets") but reps was not specified:
  // In spoken gym logging, "10 reps" is frequently transcribed as "10 sets", or athletes say "10 sets" meaning 10 reps.
  // If count >= 5 (or when there are no other numbers), treat it as reps.
  if (parsedReps === undefined && setCount !== undefined && setCount >= 5) {
    parsedReps = setCount;
    setCount = undefined;
  }

  // --- Step 9: Detect Unrecognized Spoken Exercise Candidate ---
  // If no known exercise matched, look for leftover non-filler words
  let detectedUnknownExercise: string | undefined;

  if (!detectedExercise) {
    const cleanedResidual = working
      .replace(/\b(?:on|of|for|with|at|did|done|completed|in|my|and|the|a|an)\b/gi, ' ')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanedResidual.length >= 3 && !/^(?:set|sets|reps|same|workout)$/i.test(cleanedResidual)) {
      // Check if cleanedResidual is a close fuzzy match to any known alias
      let fallbackMatch: string | undefined;
      let maxSim = 0;
      for (const alias of sortedAllAliases) {
        const sim = stringSimilarity(cleanedResidual, alias);
        if (sim >= 0.82 && sim > maxSim) {
          maxSim = sim;
          fallbackMatch = allAliasesMap[alias];
        }
      }

      if (fallbackMatch) {
        detectedExercise = fallbackMatch;
      } else {
        detectedUnknownExercise = cleanedResidual;
      }
    }
  }

  // --- Step 10: Context Resolution & Disambiguation ---
  const hadAnyNumbersOrValues =
    parsedWeight !== undefined ||
    parsedReps !== undefined ||
    explicitSetNumber !== undefined ||
    setCount !== undefined ||
    isSameWeight ||
    isNextSet;

  // 10a. Exercise selection only for KNOWN exercise (e.g. "Next exercise, seated row")
  if (detectedExercise && !hadAnyNumbersOrValues) {
    return {
      type: 'SELECT_EXERCISE',
      exercise: detectedExercise,
      rawTranscript: text,
    };
  }

  // 10b. Unknown exercise candidate detected! Trigger CONFIRM_EXERCISE prompt
  if (detectedUnknownExercise) {
    const suggested = toTitleCase(detectedUnknownExercise);
    const resolvedWeight = isSameWeight ? (lastKnownWeight > 0 ? lastKnownWeight : undefined) : parsedWeight;

    return {
      type: 'CONFIRM_EXERCISE',
      spokenPhrase: detectedUnknownExercise,
      suggestedExercise: suggested,
      weight: resolvedWeight,
      reps: parsedReps,
      unit,
      setNumber: explicitSetNumber,
      setCount,
      rawTranscript: text,
      isSelectionOnly: !hadAnyNumbersOrValues,
    };
  }

  // 10c. Confident known exercise detected with sets/weights
  const targetExercise = detectedExercise || currentExerciseName;

  const isBodyweightEx =
    Boolean(targetExercise) &&
    (/\b(?:pull[\s-]*ups?|chin[\s-]*ups?|push[\s-]*ups?|dips?|sit[\s-]*ups?|crunches?|planks?|lunges?|burpees?|jumping\s+jacks|mountain\s+climbers|leg\s+raises|muscle[\s-]*ups?)\b/i.test(
      targetExercise!
    ) || targetExercise!.toLowerCase().includes('bodyweight'));

  let finalWeight = parsedWeight;
  if (isSameWeight) {
    finalWeight = lastKnownWeight > 0 ? lastKnownWeight : 0;
  } else if (finalWeight === undefined && isBodyweightEx) {
    finalWeight = 0;
  } else if (finalWeight === undefined && targetExercise && currentExerciseName === targetExercise && lastKnownWeight > 0 && parsedReps !== undefined) {
    // If user says "8 reps" or "another set of 8" for the active exercise, carry over last weight
    finalWeight = lastKnownWeight;
  }

  const finalReps = parsedReps;

  const additionalSets: ParsedSet[] = [];
  if (setCount && setCount > 1 && finalWeight !== undefined && finalReps !== undefined) {
    for (let i = 1; i < setCount; i++) {
      additionalSets.push({
        weight: finalWeight,
        reps: finalReps,
        unit,
      });
    }
  }

  if (detectedExercise) {
    return {
      type: 'ADD_SET',
      exercise: detectedExercise,
      weight: finalWeight,
      reps: finalReps,
      unit,
      setNumber: explicitSetNumber,
      setCount,
      additionalSets: additionalSets.length > 0 ? additionalSets : undefined,
      rawTranscript: text,
    };
  }

  if (currentExerciseName) {
    return {
      type: 'ADD_SET_CURRENT',
      weight: finalWeight,
      reps: finalReps,
      unit,
      setNumber: explicitSetNumber,
      setCount,
      rawTranscript: text,
    };
  }

  // 10d. Numbers spoken without any exercise identified
  if (parsedReps !== undefined || parsedWeight !== undefined) {
    return {
      type: 'AMBIGUOUS',
      rawTranscript: text,
      reason: 'No exercise identified for these set values. Please name the exercise.',
      suggestedWeight: finalWeight,
      suggestedReps: parsedReps,
      suggestedUnit: unit,
      suggestedSetNumber: explicitSetNumber,
    };
  }

  return {
    type: 'AMBIGUOUS',
    rawTranscript: text,
    reason: 'Could not clearly identify exercise, weight, or reps. Please try again.',
  };
}
