// Comprehensive test suite for RepVoice workout command parser

export const EXERCISE_ALIASES = {
  // Incline bench press
  'incline dumbbell bench press': 'Incline Dumbbell Bench Press',
  'incline dumbbell press': 'Incline Dumbbell Bench Press',
  'incline db bench press': 'Incline Dumbbell Bench Press',
  'incline db press': 'Incline Dumbbell Bench Press',
  'incline barbell bench press': 'Incline Barbell Bench Press',
  'incline bench press': 'Incline Bench Press',
  'incline bench': 'Incline Bench Press',
  'incline press': 'Incline Bench Press',

  // Flat & dumbbell bench press
  'flat dumbbell bench press': 'Flat Dumbbell Bench Press',
  'flat dumbbell press': 'Flat Dumbbell Bench Press',
  'flat db bench press': 'Flat Dumbbell Bench Press',
  'dumbbell bench press': 'Dumbbell Bench Press',
  'dumbbell bench': 'Dumbbell Bench Press',
  'dumbbell chest press': 'Dumbbell Bench Press',
  'db bench press': 'Dumbbell Bench Press',
  'db bench': 'Dumbbell Bench Press',
  'decline bench press': 'Decline Bench Press',
  'decline bench': 'Decline Bench Press',
  'close grip bench press': 'Close Grip Bench Press',
  'close grip bench': 'Close Grip Bench Press',
  'barbell bench press': 'Bench Press',
  'flat bench press': 'Bench Press',
  'flat bench': 'Bench Press',
  'bench press': 'Bench Press',
  'bench': 'Bench Press',

  // Rows
  'dumbbell rows': 'Dumbbell Row',
  'dumbbell row': 'Dumbbell Row',
  'single arm dumbbell row': 'Dumbbell Row',
  'one arm dumbbell row': 'Dumbbell Row',
  'db rows': 'Dumbbell Row',
  'db row': 'Dumbbell Row',
  'barbell rows': 'Barbell Row',
  'barbell row': 'Barbell Row',
  'bent over rows': 'Barbell Row',
  'bent over row': 'Barbell Row',
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
  'deadlifts': 'Deadlift',
  'deadlift': 'Deadlift',

  // Squats
  'bulgarian split squats': 'Bulgarian Split Squats',
  'bulgarian split squat': 'Bulgarian Split Squats',
  'split squats': 'Bulgarian Split Squats',
  'split squat': 'Bulgarian Split Squats',
  'front squats': 'Front Squat',
  'front squat': 'Front Squat',
  'hack squats': 'Hack Squat',
  'hack squat': 'Hack Squat',
  'goblet squats': 'Goblet Squat',
  'goblet squat': 'Goblet Squat',
  'barbell squats': 'Squat',
  'barbell squat': 'Squat',
  'back squats': 'Squat',
  'back squat': 'Squat',
  'squats': 'Squat',
  'squat': 'Squat',

  // Shoulders
  'seated dumbbell shoulder press': 'Seated Dumbbell Shoulder Press',
  'seated dumbbell press': 'Seated Dumbbell Shoulder Press',
  'dumbbell shoulder press': 'Shoulder Press',
  'overhead press': 'Overhead Press',
  'military press': 'Military Press',
  'shoulder press': 'Shoulder Press',
  'arnold press': 'Arnold Press',
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
  'chest flyes': 'Chest Flyes',
  'chest flies': 'Chest Flyes',
  'chest fly': 'Chest Flyes',
  'cable crossover': 'Cable Crossover',
  'push ups': 'Push Ups',
  'push up': 'Push Ups',
  'push-ups': 'Push Ups',
  'push-up': 'Push Ups',
  'plank': 'Plank',
  'russian twists': 'Russian Twists',
  'hanging leg raises': 'Hanging Leg Raises',
};

const SORTED_ALIASES = Object.keys(EXERCISE_ALIASES).sort((a, b) => b.length - a.length);

const ORDINAL_MAP = {
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

export function normalizeSpokenNumbers(text) {
  const numberWords = {
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
    .replace(/lb['’]?s\b/g, 'lbs')
    .replace(/(\d+)\s*['’]s\b/g, '$1')
    .replace(/\band\s+a\s+half\b/g, '.5')
    .replace(/\bpoint\s+five\b/g, '.5');

  str = str.replace(/\bone\s+hundred(?:\s+and)?\s+(\w+)\b/g, (_, ones) => {
    const val = numberWords[ones];
    return val !== undefined ? String(100 + val) : '100 ' + ones;
  });

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

  for (const [word, val] of Object.entries(numberWords)) {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    str = str.replace(reg, String(val));
  }

  return str;
}

export function parseWorkoutCommand(
  rawTranscript,
  currentExerciseName,
  lastKnownWeight = 0,
  defaultUnit = 'kg'
) {
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

  // --- Step 2: Detect Control Commands ---
  if (/\b(?:finish|end|complete|done)\s+(?:workout|session)\b/i.test(working)) {
    return {
      type: 'FINISH_WORKOUT',
      rawTranscript: text,
    };
  }

  const isSetDoneCommand = /\b(?:set\s+(?:done|finished|complete|completed)|done\s+set|finished\s+set)\b/i.test(working);
  const hasNumbersOrReps = /\b\d+(\.\d+)?\b/.test(working) || /\b(?:reps?|repetitions?|kilos?|kg|lbs?|pounds?)\b/i.test(working);

  if (isSetDoneCommand && !hasNumbersOrReps) {
    return {
      type: 'SET_DONE',
      rawTranscript: text,
    };
  }

  // --- Step 3: Extract Explicit Set Number & Multi-Set Counts ---
  let explicitSetNumber;
  let setCount;
  let isNextSet = false;

  // 3a. "Next set" or "another set" marker - MUST BE CHECKED BEFORE numSetMatch!
  if (/\b(?:next|another|one\s+more)\s+set\b/i.test(working)) {
    isNextSet = true;
    working = working.replace(/\b(?:next|another|one\s+more)\s+set\b/gi, ' ');
  }

  // 3b. Explicit ordinal set: e.g. "for my second set", "third set"
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

  // 3c. Explicit numbered set: "set 2", "set #3" (ensure not followed by "reps")
  if (explicitSetNumber === undefined) {
    const numSetMatch = working.match(/\bset\s*#?\s*(\d+)(?!\s*(?:reps?|repetitions?))\b/i);
    if (numSetMatch) {
      explicitSetNumber = parseInt(numSetMatch[1], 10);
      working = working.replace(numSetMatch[0], ' ');
    }
  }

  // 3d. Multi-set count: e.g. "for 3 sets", "3 sets of"
  const multiSetMatch = working.match(/\b(?:for\s+)?(\d+)\s+sets?\b/i);
  if (multiSetMatch) {
    const count = parseInt(multiSetMatch[1], 10);
    if (count > 0) {
      setCount = count;
      working = working.replace(multiSetMatch[0], ' ');
    }
  }

  // --- Step 4: Identify Exercise Anywhere in Sentence ---
  let detectedExercise;

  for (const alias of SORTED_ALIASES) {
    const regex = new RegExp(`\\b${alias}\\b`, 'i');
    if (regex.test(working)) {
      detectedExercise = EXERCISE_ALIASES[alias];
      working = working.replace(regex, ' ');
      break;
    }
  }

  if (!detectedExercise) {
    const prefixExMatch = working.match(
      /(?:next\s+exercise|switch\s+to|starting|now\s+doing)\s+([a-zA-Z\s]+?)(?=\b\d|\band\b|\bat\b|\bfor\b|$)/i
    );
    if (prefixExMatch && prefixExMatch[1].trim().length > 2) {
      const candidate = prefixExMatch[1].trim();
      if (!/^(?:set|sets|reps|completed|workout|same|done|did)$/i.test(candidate)) {
        detectedExercise = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        working = working.replace(prefixExMatch[0], ' ');
      }
    }
  }

  working = working
    .replace(/\b(?:on|of|for|with|at)\s+(?=\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // --- Step 5: Extract Weight & Unit ---
  let parsedWeight;
  let unit = defaultUnit;
  let isSameWeight = false;

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
    const prepWeightMatch = working.match(/\b(?:at|with)\s+(\d+(?:\.\d+)?)\b/i);
    if (prepWeightMatch) {
      parsedWeight = parseFloat(prepWeightMatch[1]);
      working = working.replace(prepWeightMatch[0], ' ');
    }
  }

  // --- Step 6: Extract Repetitions ---
  let parsedReps;

  const repsMatch = working.match(/(\d+)\s*(?:reps?|repetitions?)\b/i);
  if (repsMatch) {
    parsedReps = parseInt(repsMatch[1], 10);
    working = working.replace(repsMatch[0], ' ');
  }

  if (parsedReps === undefined) {
    const didMatch = working.match(/\b(?:did|done|completed|for)\s+(\d+)\b/i);
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

  // --- Step 7: Resolve Remaining Untagged Numbers ---
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

  // --- Step 8: Context Resolution & Disambiguation ---
  const hadAnyNumbersOrValues =
    parsedWeight !== undefined ||
    parsedReps !== undefined ||
    explicitSetNumber !== undefined ||
    setCount !== undefined ||
    isSameWeight ||
    isNextSet;

  if (detectedExercise && !hadAnyNumbersOrValues) {
    return {
      type: 'SELECT_EXERCISE',
      exercise: detectedExercise,
      rawTranscript: text,
    };
  }

  const targetExercise = detectedExercise || currentExerciseName;

  let finalWeight = parsedWeight;
  if (isSameWeight) {
    finalWeight = lastKnownWeight > 0 ? lastKnownWeight : 0;
  } else if (finalWeight === undefined && targetExercise && currentExerciseName === targetExercise && lastKnownWeight > 0) {
    finalWeight = lastKnownWeight;
  }

  const finalReps = parsedReps !== undefined ? parsedReps : 10;

  const additionalSets = [];
  if (setCount && setCount > 1) {
    const setWeight = finalWeight !== undefined ? finalWeight : lastKnownWeight || 0;
    for (let i = 1; i < setCount; i++) {
      additionalSets.push({
        weight: setWeight,
        reps: finalReps,
        unit,
      });
    }
  }

  if (detectedExercise) {
    return {
      type: 'ADD_SET',
      exercise: detectedExercise,
      weight: finalWeight !== undefined ? finalWeight : lastKnownWeight || 0,
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

let passed = 0;
let failed = 0;

function assert(condition, message, details) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    if (details) console.error('    Details:', JSON.stringify(details, null, 2));
    failed++;
  }
}

console.log('=====================================================');
console.log('RUNNING COMPREHENSIVE WORKOUT COMMAND PARSER TESTS');
console.log('=====================================================\n');

// Test 1: Standard order
{
  const res = parseWorkoutCommand('Bench press, 40 kilos, 10 reps.');
  assert(res.type === 'ADD_SET' && res.exercise === 'Bench Press' && res.weight === 40 && res.reps === 10 && res.unit === 'kg',
    '1. "Bench press, 40 kilos, 10 reps."', res);
}

// Test 2: Reps first, exercise middle, weight last
{
  const res = parseWorkoutCommand('10 reps on bench press at 40 kilos.');
  assert(res.type === 'ADD_SET' && res.exercise === 'Bench Press' && res.weight === 40 && res.reps === 10 && res.unit === 'kg',
    '2. "10 reps on bench press at 40 kilos."', res);
}

// Test 3: Weight first, exercise middle, reps last
{
  const res = parseWorkoutCommand('40 kg bench press for 10 reps.');
  assert(res.type === 'ADD_SET' && res.exercise === 'Bench Press' && res.weight === 40 && res.reps === 10 && res.unit === 'kg',
    '3. "40 kg bench press for 10 reps."', res);
}

// Test 4: Reps first, weight middle, exercise last
{
  const res = parseWorkoutCommand('10 reps, 40 kilos, bench press.');
  assert(res.type === 'ADD_SET' && res.exercise === 'Bench Press' && res.weight === 40 && res.reps === 10 && res.unit === 'kg',
    '4. "10 reps, 40 kilos, bench press."', res);
}

// Test 5: Explicit set number: "set 2"
{
  const res = parseWorkoutCommand('Bench press, set 2, 10 reps, 40 kilos.');
  assert(res.type === 'ADD_SET' && res.exercise === 'Bench Press' && res.setNumber === 2 && res.weight === 40 && res.reps === 10,
    '5. "Bench press, set 2, 10 reps, 40 kilos."', res);
}

// Test 6: Ordinal set: "second set of dumbbell rows at 20 kilograms"
{
  const res = parseWorkoutCommand('I did 12 repetitions for my second set of dumbbell rows at 20 kilograms.');
  assert(res.type === 'ADD_SET' && res.exercise === 'Dumbbell Row' && res.setNumber === 2 && res.weight === 20 && res.reps === 12,
    '6. "I did 12 repetitions for my second set of dumbbell rows at 20 kilograms."', res);
}

// Test 7: Context reuse: "Set 3, 8 reps, same weight"
{
  const res = parseWorkoutCommand('Set 3, 8 reps, same weight.', 'Bench Press', 40, 'kg');
  assert(res.type === 'ADD_SET_CURRENT' && res.setNumber === 3 && res.reps === 8 && res.weight === 40,
    '7. "Set 3, 8 reps, same weight."', res);
}

// Test 8: Multi-set: "12 reps for 3 sets at 30 kilos on lat pulldown"
{
  const res = parseWorkoutCommand('12 reps for 3 sets at 30 kilos on lat pulldown.');
  assert(res.type === 'ADD_SET' && res.exercise === 'Lat Pulldown' && res.weight === 30 && res.reps === 12 && res.setCount === 3 && res.additionalSets?.length === 2,
    '8. "12 reps for 3 sets at 30 kilos on lat pulldown."', res);
}

// Test 9: Control command: "Set done"
{
  const res = parseWorkoutCommand('Set done');
  assert(res.type === 'SET_DONE', '9. "Set done"', res);
}

// Test 10: Control command: "Finish workout"
{
  const res = parseWorkoutCommand('Finish workout');
  assert(res.type === 'FINISH_WORKOUT', '10. "Finish workout"', res);
}

// Test 11: Exercise selection only (no fake sets)
{
  const res = parseWorkoutCommand('Next exercise, seated row');
  assert(res.type === 'SELECT_EXERCISE' && res.exercise === 'Seated Row',
    '11. "Next exercise, seated row"', res);
}

// Test 12: Reps only attached to active exercise
{
  const res = parseWorkoutCommand('I did 10 reps', 'Bench Press', 40, 'kg');
  assert(res.type === 'ADD_SET_CURRENT' && res.reps === 10 && res.weight === 40,
    '12. "I did 10 reps" (with active context)', res);
}

// Test 13: "Next set, 8 reps"
{
  const res = parseWorkoutCommand('Next set, 8 reps', 'Bench Press', 40, 'kg');
  assert(res.type === 'ADD_SET_CURRENT' && res.reps === 8 && res.weight === 40,
    '13. "Next set, 8 reps"', res);
}

// Test 14: Squats weight first then reps
{
  const res = parseWorkoutCommand('Squats 100 kilos for 5 reps');
  assert(res.type === 'ADD_SET' && res.exercise === 'Squat' && res.weight === 100 && res.reps === 5,
    '14. "Squats 100 kilos for 5 reps"', res);
}

// Test 15: "3 sets of 10 reps bench press at 60 kg"
{
  const res = parseWorkoutCommand('3 sets of 10 reps bench press at 60 kg');
  assert(res.type === 'ADD_SET' && res.exercise === 'Bench Press' && res.weight === 60 && res.reps === 10 && res.setCount === 3 && res.additionalSets?.length === 2,
    '15. "3 sets of 10 reps bench press at 60 kg"', res);
}

// Test 16: Bodyweight exercise
{
  const res = parseWorkoutCommand('Bodyweight pull ups 15 reps');
  assert(res.type === 'ADD_SET' && res.exercise === 'Pull Ups' && res.weight === 0 && res.reps === 15,
    '16. "Bodyweight pull ups 15 reps"', res);
}

// Test 17: Pounds at end: "5 reps at 100 pounds deadlift"
{
  const res = parseWorkoutCommand('5 reps at 100 pounds deadlift');
  assert(res.type === 'ADD_SET' && res.exercise === 'Deadlift' && res.weight === 100 && res.unit === 'lbs' && res.reps === 5,
    '17. "5 reps at 100 pounds deadlift"', res);
}

// Test 18: Deadlift lbs with reps
{
  const res = parseWorkoutCommand('Deadlift 315 lbs 5 reps');
  assert(res.type === 'ADD_SET' && res.exercise === 'Deadlift' && res.weight === 315 && res.unit === 'lbs' && res.reps === 5,
    '18. "Deadlift 315 lbs 5 reps"', res);
}

// Test 19: Weight first, then repetitions, then exercise: "30 kilos 10 repetitions seated cable row"
{
  const res = parseWorkoutCommand('30 kilos 10 repetitions seated cable row');
  assert(res.type === 'ADD_SET' && res.exercise === 'Seated Row' && res.weight === 30 && res.reps === 10,
    '19. "30 kilos 10 repetitions seated cable row"', res);
}

// Test 20: Ordinal set at end: "Bicep curls 15 kg 12 reps for my 3rd set"
{
  const res = parseWorkoutCommand('Bicep curls 15 kg 12 reps for my 3rd set');
  assert(res.type === 'ADD_SET' && res.exercise === 'Bicep Curls' && res.setNumber === 3 && res.weight === 15 && res.reps === 12,
    '20. "Bicep curls 15 kg 12 reps for my 3rd set"', res);
}

// Test 21: Ambiguous speech without numbers or exercise
{
  const res = parseWorkoutCommand('What time is it right now');
  assert(res.type === 'AMBIGUOUS', '21. "What time is it right now" -> AMBIGUOUS', res);
}

// Test 22: Numbers spoken with no exercise or context
{
  const res = parseWorkoutCommand('10 reps at 50 kilos');
  assert(res.type === 'AMBIGUOUS' && res.suggestedWeight === 50 && res.suggestedReps === 10,
    '22. "10 reps at 50 kilos" without context -> AMBIGUOUS', res);
}

console.log('\n-----------------------------------------------------');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('-----------------------------------------------------');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
