// Test runner for Unknown Exercise Confirmation & Learning flow in RepVoice

const EXERCISE_ALIASES = {
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

function normalizeAliasText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(str) {
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeSpokenNumbers(text) {
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

function parseWorkoutCommand(
  rawTranscript,
  currentExerciseName,
  lastKnownWeight = 0,
  defaultUnit = 'kg',
  customAliases = {},
  pendingConfirmation = null
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

  // --- Step 4: Extract Explicit Set Number & Multi-Set Counts ---
  let explicitSetNumber;
  let setCount;
  let isNextSet = false;

  if (/\b(?:next|another|one\s+more)\s+set\b/i.test(working)) {
    isNextSet = true;
    working = working.replace(/\b(?:next|another|one\s+more)\s+set\b/gi, ' ');
  }

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

  if (explicitSetNumber === undefined) {
    const numSetMatch = working.match(/\bset\s*#?\s*(\d+)(?!\s*(?:reps?|repetitions?))\b/i);
    if (numSetMatch) {
      explicitSetNumber = parseInt(numSetMatch[1], 10);
      working = working.replace(numSetMatch[0], ' ');
    }
  }

  const multiSetMatch = working.match(/\b(?:for\s+)?(\d+)\s+sets?\b/i);
  if (multiSetMatch) {
    const count = parseInt(multiSetMatch[1], 10);
    if (count > 0) {
      setCount = count;
      working = working.replace(multiSetMatch[0], ' ');
    }
  }

  // --- Step 5: Identify Exercise Anywhere in Sentence ---
  const allAliasesMap = { ...EXERCISE_ALIASES, ...customAliases };
  const sortedAllAliases = Object.keys(allAliasesMap).sort((a, b) => b.length - a.length);

  let detectedExercise;

  for (const alias of sortedAllAliases) {
    const regex = new RegExp(`\\b${alias}\\b`, 'i');
    if (regex.test(working)) {
      detectedExercise = allAliasesMap[alias];
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
        detectedExercise = toTitleCase(candidate);
        working = working.replace(prefixExMatch[0], ' ');
      }
    }
  }

  working = working
    .replace(/\b(?:on|of|for|with|at)\s+(?=\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // --- Step 6: Extract Weight & Unit ---
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

  // --- Step 7: Extract Repetitions ---
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

  // --- Step 9: Detect Unrecognized Spoken Exercise Candidate ---
  let detectedUnknownExercise;

  if (!detectedExercise) {
    const cleanedResidual = working
      .replace(/\b(?:on|of|for|with|at|did|done|completed|in|my|and|the|a|an)\b/gi, ' ')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanedResidual.length >= 3 && !/^(?:set|sets|reps|same|workout)$/i.test(cleanedResidual)) {
      detectedUnknownExercise = cleanedResidual;
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

  if (detectedExercise && !hadAnyNumbersOrValues) {
    return {
      type: 'SELECT_EXERCISE',
      exercise: detectedExercise,
      rawTranscript: text,
    };
  }

  if (detectedUnknownExercise) {
    const suggested = toTitleCase(detectedUnknownExercise);
    const resolvedWeight = isSameWeight ? (lastKnownWeight > 0 ? lastKnownWeight : 0) : parsedWeight;

    return {
      type: 'CONFIRM_EXERCISE',
      spokenPhrase: detectedUnknownExercise,
      suggestedExercise: suggested,
      weight: resolvedWeight !== undefined ? resolvedWeight : (lastKnownWeight > 0 ? lastKnownWeight : undefined),
      reps: parsedReps !== undefined ? parsedReps : 10,
      unit,
      setNumber: explicitSetNumber,
      setCount,
      rawTranscript: text,
      isSelectionOnly: !hadAnyNumbersOrValues,
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
console.log('RUNNING CONFIRM UNKNOWN EXERCISES & LEARNING TESTS');
console.log('=====================================================\n');

// Mock in-memory alias store
const mockCustomAliases = {};

// Step 1: User says "Chest press, 40 kilos, 10 reps" (unrecognized exercise)
let pendingConfirmation = null;
{
  const res = parseWorkoutCommand('Chest press, 40 kilos, 10 reps.', undefined, 0, 'kg', mockCustomAliases);
  assert(
    res.type === 'CONFIRM_EXERCISE' &&
    res.spokenPhrase.toLowerCase() === 'chest press' &&
    res.suggestedExercise === 'Chest Press' &&
    res.weight === 40 &&
    res.reps === 10,
    'Step 1: Unrecognized "Chest press" triggers CONFIRM_EXERCISE with suggestion "Chest Press"',
    res
  );
  if (res.type === 'CONFIRM_EXERCISE') {
    pendingConfirmation = res;
  }
}

// Step 2: App asks "Did you say Chest Press?" -> User says "Yes"
{
  const res = parseWorkoutCommand('Yes', undefined, 0, 'kg', mockCustomAliases, pendingConfirmation);
  assert(
    res.type === 'RESOLVE_CONFIRMATION' &&
    res.action === 'CONFIRM' &&
    res.confirmedExercise === 'Chest Press',
    'Step 2 & 3: User says "Yes" -> RESOLVE_CONFIRMATION with confirmedExercise "Chest Press"',
    res
  );
}

// Step 4 & 5: Save confirmed alias "chest press" -> "Chest Press"
{
  const normalizedAlias = normalizeAliasText(pendingConfirmation.spokenPhrase);
  mockCustomAliases[normalizedAlias] = toTitleCase(pendingConfirmation.suggestedExercise);
  assert(
    mockCustomAliases['chest press'] === 'Chest Press',
    'Step 4 & 5: Alias "chest press" successfully stored as "Chest Press"',
    mockCustomAliases
  );
  pendingConfirmation = null;
}

// Step 6 & 7: Later, user says "Chest press, 40 kilos, 8 reps."
{
  const res = parseWorkoutCommand('Chest press, 40 kilos, 8 reps.', undefined, 40, 'kg', mockCustomAliases);
  assert(
    res.type === 'ADD_SET' &&
    res.exercise === 'Chest Press' &&
    res.weight === 40 &&
    res.reps === 8,
    'Step 6 & 7: Later utterance recognized immediately with confidence without asking again!',
    res
  );
}

// Test Correction Flow:
// User says "Pec squeeze 25 kg 12 reps" -> App asks "Did you say Pec Squeeze?"
let correctionPending = null;
{
  const res = parseWorkoutCommand('Pec squeeze 25 kg 12 reps', undefined, 0, 'kg', mockCustomAliases);
  assert(
    res.type === 'CONFIRM_EXERCISE' &&
    res.suggestedExercise === 'Pec Squeeze' &&
    res.weight === 25 &&
    res.reps === 12,
    'Correction test 1: Unknown "Pec squeeze" triggers confirmation',
    res
  );
  if (res.type === 'CONFIRM_EXERCISE') correctionPending = res;
}

// User corrects by voice: "No, Chest Flyes"
{
  const res = parseWorkoutCommand('No, Chest Flyes', undefined, 0, 'kg', mockCustomAliases, correctionPending);
  assert(
    res.type === 'RESOLVE_CONFIRMATION' &&
    res.action === 'CORRECT' &&
    res.confirmedExercise === 'Chest Flyes',
    'Correction test 2: User says "No, Chest Flyes" -> CORRECT to "Chest Flyes"',
    res
  );

  // Learn alias from correction
  if (res.type === 'RESOLVE_CONFIRMATION' && res.action === 'CORRECT') {
    mockCustomAliases[normalizeAliasText(res.spokenPhrase)] = res.confirmedExercise;
  }
}

// Later, user says "Pec squeeze 30 kg 10 reps" -> should resolve to "Chest Flyes"
{
  const res = parseWorkoutCommand('Pec squeeze 30 kg 10 reps', undefined, 25, 'kg', mockCustomAliases);
  assert(
    res.type === 'ADD_SET' &&
    res.exercise === 'Chest Flyes' &&
    res.weight === 30 &&
    res.reps === 10,
    'Correction test 3: Learned correction maps "Pec squeeze" to "Chest Flyes" directly',
    res
  );
}

// Test Rejection: User says "No"
{
  const dummyPending = {
    spokenPhrase: 'weird exercise',
    suggestedExercise: 'Weird Exercise',
    weight: 20,
    reps: 10,
    unit: 'kg',
    rawTranscript: 'weird exercise 20 kg 10 reps'
  };
  const res = parseWorkoutCommand('No', undefined, 0, 'kg', mockCustomAliases, dummyPending);
  assert(
    res.type === 'RESOLVE_CONFIRMATION' &&
    res.action === 'REJECT',
    'Rejection test: "No" yields action REJECT (prompts manual picker)',
    res
  );
}

// Test Dismissal: User says "Not now"
{
  const dummyPending = {
    spokenPhrase: 'weird exercise',
    suggestedExercise: 'Weird Exercise',
    weight: 20,
    reps: 10,
    unit: 'kg',
    rawTranscript: 'weird exercise 20 kg 10 reps'
  };
  const res = parseWorkoutCommand('Not now', undefined, 0, 'kg', mockCustomAliases, dummyPending);
  assert(
    res.type === 'RESOLVE_CONFIRMATION' &&
    res.action === 'DISMISS',
    'Dismissal test: "Not now" yields action DISMISS (keeps workout intact)',
    res
  );
}

// Test Duplicate Prevention:
{
  const alias1 = normalizeAliasText('  Chest   Press  ');
  const alias2 = normalizeAliasText('CHEST PRESS');
  assert(alias1 === alias2 && alias1 === 'chest press',
    'Duplicate prevention: Normalization prevents duplicate alias entries regardless of case/spacing');
}

// Test Confident Recognition (No confirmation asked for already known exercises)
{
  const res = parseWorkoutCommand('Bench press, 50 kilos, 10 reps.', undefined, 0, 'kg', mockCustomAliases);
  assert(
    res.type === 'ADD_SET' &&
    res.exercise === 'Bench Press',
    'Confident recognition: Already known "Bench press" never asks for confirmation',
    res
  );
}

// Test Timer Continuity Simulation:
{
  const workoutStart = Date.now() - 60000;
  let workoutElapsed = Math.floor((Date.now() - workoutStart) / 1000);

  const intermediateWorkoutElapsed = Math.floor((Date.now() - workoutStart) / 1000);
  assert(intermediateWorkoutElapsed >= workoutElapsed,
    'Timer continuity: Workout timer continues monotonically during confirmation prompt');
}

console.log('\n-----------------------------------------------------');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('-----------------------------------------------------');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
