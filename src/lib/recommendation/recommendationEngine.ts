/**
 * Rule-Based Daily Workout Recommendation Engine for RepVoice
 *
 * Pure, deterministic functions that analyze user workout history,
 * calculate sensible progressions, suggest exercise variations,
 * and construct explainable daily workout recommendations.
 */

import {
  Workout,
  WeightUnit,
  MuscleGroup,
  DailyWorkoutRecommendation,
  RecommendedExerciseItem,
  ExerciseVariation,
} from '../../types';
import { getLocalDateKey } from '../history/dateGrouping';

// ----------------------------------------------------------------------
// Exercise Catalogue & Muscle Group Classification
// ----------------------------------------------------------------------

const EXERCISE_MUSCLE_MAP: Record<string, MuscleGroup> = {
  // Chest
  'bench press': 'chest',
  'incline barbell bench press': 'chest',
  'incline dumbbell bench press': 'chest',
  'flat dumbbell bench press': 'chest',
  'dumbbell bench press': 'chest',
  'incline bench press': 'chest',
  'decline bench press': 'chest',
  'close grip bench press': 'chest',
  'chest press': 'chest',
  'push ups': 'chest',
  'chest flyes': 'chest',
  'cable crossover': 'chest',
  'pec deck': 'chest',
  'dips': 'chest',

  // Back
  'deadlift': 'back',
  'sumo deadlift': 'back',
  'trap bar deadlift': 'back',
  'romanian deadlift': 'back',
  'barbell row': 'back',
  'dumbbell row': 'back',
  'cable row': 'back',
  'seated cable row': 'back',
  't-bar row': 'back',
  'lat pulldown': 'back',
  'pull ups': 'back',
  'chin ups': 'back',
  'shrugs': 'back',

  // Legs
  'squat': 'legs',
  'front squat': 'legs',
  'hack squat': 'legs',
  'goblet squat': 'legs',
  'bulgarian split squats': 'legs',
  'leg press': 'legs',
  'lunges': 'legs',
  'walking lunges': 'legs',
  'leg extension': 'legs',
  'leg curl': 'legs',
  'lying leg curl': 'legs',
  'seated leg curl': 'legs',
  'calf raises': 'legs',

  // Shoulders
  'overhead press': 'shoulders',
  'shoulder press': 'shoulders',
  'military press': 'shoulders',
  'arnold press': 'shoulders',
  'seated dumbbell shoulder press': 'shoulders',
  'lateral raises': 'shoulders',
  'dumbbell lateral raises': 'shoulders',
  'front raises': 'shoulders',
  'face pulls': 'shoulders',

  // Arms
  'bicep curls': 'arms',
  'incline dumbbell curls': 'arms',
  'preacher curls': 'arms',
  'hammer curls': 'arms',
  'tricep pushdown': 'arms',
  'tricep extension': 'arms',
  'skull crushers': 'arms',
  'overhead tricep extension': 'arms',

  // Core
  'plank': 'core',
  'russian twists': 'core',
  'hanging leg raises': 'core',
};

// Common variations mapped per canonical exercise
const EXERCISE_VARIATIONS_MAP: Record<string, string[]> = {
  // Chest
  'Bench Press': ['Incline Dumbbell Bench Press', 'Dumbbell Bench Press', 'Push Ups'],
  'Incline Bench Press': ['Incline Dumbbell Bench Press', 'Bench Press', 'Chest Flyes'],
  'Dumbbell Bench Press': ['Bench Press', 'Incline Dumbbell Bench Press', 'Push Ups'],
  'Incline Dumbbell Bench Press': ['Dumbbell Bench Press', 'Incline Bench Press'],
  'Push Ups': ['Bench Press', 'Dips', 'Chest Flyes'],
  'Chest Flyes': ['Pec Deck', 'Cable Crossover', 'Dumbbell Bench Press'],
  'Pec Deck': ['Chest Flyes', 'Cable Crossover'],

  // Back
  'Barbell Row': ['Dumbbell Row', 'Seated Cable Row', 'T-Bar Row'],
  'Dumbbell Row': ['Barbell Row', 'Seated Cable Row'],
  'Seated Cable Row': ['Barbell Row', 'Dumbbell Row', 'Lat Pulldown'],
  'Lat Pulldown': ['Pull Ups', 'Seated Cable Row', 'Dumbbell Row'],
  'Pull Ups': ['Lat Pulldown', 'Chin Ups'],
  'Deadlift': ['Romanian Deadlift', 'Trap Bar Deadlift'],
  'Romanian Deadlift': ['Deadlift', 'Sumo Deadlift'],

  // Legs
  'Squat': ['Leg Press', 'Front Squat', 'Goblet Squat'],
  'Front Squat': ['Squat', 'Goblet Squat', 'Leg Press'],
  'Goblet Squat': ['Squat', 'Leg Press'],
  'Leg Press': ['Squat', 'Bulgarian Split Squats', 'Lunges'],
  'Bulgarian Split Squats': ['Lunges', 'Leg Press'],
  'Lunges': ['Walking Lunges', 'Bulgarian Split Squats'],
  'Leg Extension': ['Squat', 'Leg Press'],
  'Leg Curl': ['Lying Leg Curl', 'Romanian Deadlift'],
  'Calf Raises': ['Leg Press'],

  // Shoulders
  'Overhead Press': ['Seated Dumbbell Shoulder Press', 'Shoulder Press', 'Arnold Press'],
  'Shoulder Press': ['Overhead Press', 'Seated Dumbbell Shoulder Press'],
  'Seated Dumbbell Shoulder Press': ['Overhead Press', 'Arnold Press'],
  'Lateral Raises': ['Dumbbell Lateral Raises', 'Face Pulls'],
  'Dumbbell Lateral Raises': ['Lateral Raises', 'Face Pulls'],
  'Face Pulls': ['Lateral Raises', 'Dumbbell Row'],

  // Arms
  'Bicep Curls': ['Hammer Curls', 'Incline Dumbbell Curls'],
  'Hammer Curls': ['Bicep Curls', 'Incline Dumbbell Curls'],
  'Incline Dumbbell Curls': ['Bicep Curls', 'Hammer Curls'],
  'Tricep Pushdown': ['Tricep Extension', 'Skull Crushers', 'Dips'],
  'Tricep Extension': ['Tricep Pushdown', 'Skull Crushers'],
  'Skull Crushers': ['Tricep Pushdown', 'Overhead Tricep Extension'],

  // Core
  'Plank': ['Hanging Leg Raises', 'Russian Twists'],
  'Russian Twists': ['Plank', 'Hanging Leg Raises'],
  'Hanging Leg Raises': ['Plank', 'Russian Twists'],
};

/**
 * Returns the primary muscle group targeted by an exercise.
 */
export function getExerciseMuscleGroup(exerciseName: string): MuscleGroup {
  if (!exerciseName) return 'full_body';
  const clean = exerciseName.toLowerCase().trim();

  if (EXERCISE_MUSCLE_MAP[clean]) {
    return EXERCISE_MUSCLE_MAP[clean];
  }

  // Fallback substring matching
  for (const [key, group] of Object.entries(EXERCISE_MUSCLE_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return group;
    }
  }

  return 'full_body';
}

/**
 * Returns practical variations for a given exercise.
 */
export function getExerciseVariations(exerciseName: string): ExerciseVariation[] {
  if (!exerciseName) return [];

  // Exact or close match in map
  let foundKey = Object.keys(EXERCISE_VARIATIONS_MAP).find(
    (k) => k.toLowerCase() === exerciseName.toLowerCase()
  );

  let varNames = foundKey ? EXERCISE_VARIATIONS_MAP[foundKey] : [];

  if (!varNames || varNames.length === 0) {
    // Fallback: Pick 2 exercises from the same muscle group
    const targetGroup = getExerciseMuscleGroup(exerciseName);
    varNames = Object.entries(EXERCISE_MUSCLE_MAP)
      .filter(([name, group]) => group === targetGroup && name.toLowerCase() !== exerciseName.toLowerCase())
      .slice(0, 3)
      .map(([name]) =>
        name
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      );
  }

  return varNames.map((name) => ({
    name,
    muscleGroup: getExerciseMuscleGroup(name),
    reason: `Alternative ${getExerciseMuscleGroup(name)} exercise targeting similar movement pattern.`,
  }));
}

// ----------------------------------------------------------------------
// Progression Calculation
// ----------------------------------------------------------------------

export interface ProgressionTarget {
  targetWeight?: number;
  targetReps: number;
  targetSets: number;
  explanation: string;
  progressionNote?: string;
  hasHistoricalData: boolean;
}

/**
 * Calculates sensible progression targets based on previous performance of this exercise.
 * Never increases weights blindly; requires consistent completion across all sets.
 */
export function calculateProgression(
  exerciseName: string,
  workouts: Workout[],
  preferredUnit: WeightUnit
): ProgressionTarget {
  if (!exerciseName || !workouts || workouts.length === 0) {
    return {
      targetSets: 3,
      targetReps: 10,
      explanation: 'Starter baseline recommendation: 3 sets of 10 reps.',
      hasHistoricalData: false,
    };
  }

  const cleanTarget = exerciseName.toLowerCase().trim();

  // Search workouts in descending order for the most recent completion of this exercise
  for (const workout of workouts) {
    if (!workout.exercises) continue;

    const matchedExercise = workout.exercises.find(
      (e) => e.exerciseName.toLowerCase().trim() === cleanTarget
    );

    if (matchedExercise && matchedExercise.sets && matchedExercise.sets.length > 0) {
      const completedSets = matchedExercise.sets.filter(
        (s) => s.isCompleted && s.reps > 0
      );

      if (completedSets.length === 0) continue;

      const numSets = completedSets.length;
      const lastReps = completedSets[completedSets.length - 1].reps;
      const weights = completedSets.map((s) => Number(s.weight) || 0).filter((w) => w > 0);
      const allRepsComfortable = completedSets.every((s) => s.reps >= 10);
      const repsDeclined =
        completedSets.length >= 2 &&
        completedSets[completedSets.length - 1].reps < completedSets[0].reps - 2;

      const baseWeight = weights.length > 0 ? weights[weights.length - 1] : undefined;

      if (baseWeight !== undefined && baseWeight > 0) {
        if (allRepsComfortable && numSets >= 3) {
          // Progress by 2.5 kg or 5 lbs conservatively
          const increment = preferredUnit === 'kg' ? 2.5 : 5;
          const progressedWeight = baseWeight + increment;
          return {
            targetWeight: progressedWeight,
            targetReps: 10,
            targetSets: numSets,
            explanation: `Previous: ${numSets} sets × 10+ reps at ${baseWeight} ${preferredUnit}. Small progression recommended.`,
            progressionNote: `Suggested target: +${increment} ${preferredUnit} progression after achieving solid reps previously.`,
            hasHistoricalData: true,
          };
        } else if (repsDeclined) {
          // Maintain or consolidate weight
          return {
            targetWeight: baseWeight,
            targetReps: Math.max(8, lastReps),
            targetSets: numSets,
            explanation: `Previous: reps declined on later sets at ${baseWeight} ${preferredUnit}. Repeat weight to build consistency.`,
            progressionNote: `Maintain ${baseWeight} ${preferredUnit} and focus on completing all reps comfortably.`,
            hasHistoricalData: true,
          };
        } else {
          // Standard maintain weight
          return {
            targetWeight: baseWeight,
            targetReps: Math.min(12, Math.max(8, lastReps)),
            targetSets: numSets,
            explanation: `Matched previous performance of ${baseWeight} ${preferredUnit} for ${lastReps} reps.`,
            progressionNote: `Maintain previous weight of ${baseWeight} ${preferredUnit}.`,
            hasHistoricalData: true,
          };
        }
      } else {
        // Bodyweight exercise (e.g. Pull Ups, Push Ups)
        const targetR = Math.min(15, Math.max(8, lastReps + 1));
        return {
          targetReps: targetR,
          targetSets: numSets,
          explanation: `Previous bodyweight volume: ${numSets} sets of ${lastReps} reps.`,
          progressionNote: `Suggested bodyweight target: ${targetR} reps.`,
          hasHistoricalData: true,
        };
      }
    }
  }

  // No historical data found for this specific exercise
  return {
    targetSets: 3,
    targetReps: 10,
    explanation: 'No previous performance logged for this exercise; conservative starter target.',
    hasHistoricalData: false,
  };
}

// ----------------------------------------------------------------------
// History Analysis & Daily Recommendation
// ----------------------------------------------------------------------

export interface WorkoutHistoryAnalysis {
  totalCompletedWorkouts: number;
  hasWorkoutToday: boolean;
  consecutiveTrainingDays: number;
  lastWorkoutDate?: string;
  lastWorkoutMuscleGroups: MuscleGroup[];
  recentMuscleFrequency: Record<MuscleGroup, number>;
}

/**
 * Analyzes completed workouts relative to the athlete's local date.
 */
export function analyzeWorkoutHistory(
  workouts: Workout[],
  localTodayKey: string
): WorkoutHistoryAnalysis {
  if (!workouts || workouts.length === 0) {
    return {
      totalCompletedWorkouts: 0,
      hasWorkoutToday: false,
      consecutiveTrainingDays: 0,
      lastWorkoutMuscleGroups: [],
      recentMuscleFrequency: {
        chest: 0,
        back: 0,
        legs: 0,
        shoulders: 0,
        arms: 0,
        core: 0,
        full_body: 0,
      },
    };
  }

  // Filter completed workouts with valid dates, sorted descending
  const completed = workouts
    .filter((w) => w.completedAt && (w.startedAt || w.completedAt))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  // Check if user already worked out today
  const hasWorkoutToday = completed.some((w) => {
    const key = getLocalDateKey(w.startedAt || w.completedAt!);
    return key === localTodayKey;
  });

  // Calculate consecutive training days ending today or yesterday
  const uniqueDates = Array.from(
    new Set(completed.map((w) => getLocalDateKey(w.startedAt || w.completedAt!)))
  ).sort().reverse();

  let consecutiveDays = 0;
  const todayMs = new Date(localTodayKey + 'T12:00:00').getTime();

  for (let i = 0; i < uniqueDates.length; i++) {
    const dateMs = new Date(uniqueDates[i] + 'T12:00:00').getTime();
    const diffDays = Math.round((todayMs - dateMs) / (1000 * 60 * 60 * 24));

    if (diffDays === i || diffDays === i + 1) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  // Analyze muscle groups in the most recent workout
  const lastWorkout = completed.length > 0 ? completed[0] : undefined;
  const lastWorkoutMuscleGroups: MuscleGroup[] = [];

  if (lastWorkout && lastWorkout.exercises) {
    lastWorkout.exercises.forEach((ex) => {
      const mg = getExerciseMuscleGroup(ex.exerciseName);
      if (!lastWorkoutMuscleGroups.includes(mg)) {
        lastWorkoutMuscleGroups.push(mg);
      }
    });
  }

  // Count frequency in last 7 days
  const recentMuscleFrequency: Record<MuscleGroup, number> = {
    chest: 0,
    back: 0,
    legs: 0,
    shoulders: 0,
    arms: 0,
    core: 0,
    full_body: 0,
  };

  const sevenDaysAgoMs = todayMs - 7 * 86400000;
  completed.forEach((w) => {
    const wMs = new Date(w.startedAt).getTime();
    if (wMs >= sevenDaysAgoMs && w.exercises) {
      w.exercises.forEach((ex) => {
        const mg = getExerciseMuscleGroup(ex.exerciseName);
        recentMuscleFrequency[mg] = (recentMuscleFrequency[mg] || 0) + 1;
      });
    }
  });

  return {
    totalCompletedWorkouts: completed.length,
    hasWorkoutToday,
    consecutiveTrainingDays: consecutiveDays,
    lastWorkoutDate: lastWorkout ? getLocalDateKey(lastWorkout.startedAt) : undefined,
    lastWorkoutMuscleGroups,
    recentMuscleFrequency,
  };
}

// ----------------------------------------------------------------------
// Standard Workout Split Routines
// ----------------------------------------------------------------------

interface RoutineTemplate {
  title: string;
  subtitle: string;
  primaryMuscleGroup: string;
  exercises: string[];
}

const ROUTINES: Record<'push' | 'pull' | 'legs' | 'full_body' | 'starter', RoutineTemplate> = {
  starter: {
    title: 'Full Body Starter',
    subtitle: 'Balanced full-body routine to build consistency',
    primaryMuscleGroup: 'Full Body',
    exercises: ['Goblet Squat', 'Dumbbell Bench Press', 'Dumbbell Row', 'Overhead Press', 'Plank'],
  },
  push: {
    title: 'Push Day (Chest & Shoulders)',
    subtitle: 'Compound pushing movements and shoulder development',
    primaryMuscleGroup: 'Chest, Shoulders & Triceps',
    exercises: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Bench Press', 'Tricep Pushdown'],
  },
  pull: {
    title: 'Pull Day (Back & Biceps)',
    subtitle: 'Back thickness, lat width, and arm strength',
    primaryMuscleGroup: 'Back, Biceps & Rear Delts',
    exercises: ['Barbell Row', 'Lat Pulldown', 'Bicep Curls', 'Face Pulls'],
  },
  legs: {
    title: 'Legs & Core',
    subtitle: 'Lower body power, hamstring development, and core stability',
    primaryMuscleGroup: 'Quads, Hamstrings & Calves',
    exercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Calf Raises', 'Plank'],
  },
  full_body: {
    title: 'Full Body Power',
    subtitle: 'Comprehensive stimulation across all major muscle groups',
    primaryMuscleGroup: 'Full Body',
    exercises: ['Squat', 'Bench Press', 'Lat Pulldown', 'Overhead Press'],
  },
};

/**
 * Builds a RecommendedExerciseItem with progression targets and variations.
 */
function buildRecommendedExerciseItem(
  name: string,
  workouts: Workout[],
  preferredUnit: WeightUnit
): RecommendedExerciseItem {
  const muscleGroup = getExerciseMuscleGroup(name);
  const progression = calculateProgression(name, workouts, preferredUnit);
  const variations = getExerciseVariations(name);

  return {
    id: `rec_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
    exerciseName: name,
    muscleGroup,
    targetSets: progression.targetSets,
    targetReps: progression.targetReps,
    targetWeight: progression.targetWeight,
    unit: preferredUnit,
    explanation: progression.explanation,
    progressionNote: progression.progressionNote,
    variations,
  };
}

/**
 * Generates a deterministic daily workout recommendation for today.
 */
export function generateDailyRecommendation(
  workouts: Workout[],
  localTodayKey: string,
  preferredUnit: WeightUnit = 'kg'
): DailyWorkoutRecommendation {
  const analysis = analyzeWorkoutHistory(workouts, localTodayKey);

  // 1. Case: User has no workout history -> Starter routine
  if (analysis.totalCompletedWorkouts === 0) {
    const template = ROUTINES.starter;
    return {
      type: 'workout',
      title: template.title,
      subtitle: template.subtitle,
      primaryMuscleGroup: template.primaryMuscleGroup,
      explanation: 'Not enough workout history yet; this is a balanced starter routine.',
      isPersonalized: false,
      isRestDay: false,
      exercises: template.exercises.map((name) =>
        buildRecommendedExerciseItem(name, workouts, preferredUnit)
      ),
      generatedForDate: localTodayKey,
    };
  }

  // 2. Case: User already completed a workout today -> Rest / Recovery
  if (analysis.hasWorkoutToday) {
    return {
      type: 'rest',
      title: 'Active Recovery & Rest',
      subtitle: 'Rest day recommended',
      primaryMuscleGroup: 'Rest & Mobility',
      explanation: 'You have already completed a workout today. Rest is essential for muscle repair.',
      isPersonalized: true,
      isRestDay: true,
      exercises: [],
      generatedForDate: localTodayKey,
    };
  }

  // 3. Case: User trained 3+ days consecutively -> Recommend Rest Day
  if (analysis.consecutiveTrainingDays >= 3) {
    return {
      type: 'rest',
      title: 'Scheduled Recovery Day',
      subtitle: 'Rest day recommended',
      primaryMuscleGroup: 'Recovery',
      explanation: `You have logged workouts ${analysis.consecutiveTrainingDays} days in a row. A recovery day is recommended to prevent overtraining.`,
      isPersonalized: true,
      isRestDay: true,
      exercises: [],
      generatedForDate: localTodayKey,
    };
  }

  // 4. Case: Select workout routine based on recent muscle group fatigue
  let selectedTemplateKey: 'push' | 'pull' | 'legs' | 'full_body' = 'push';
  let reasoning = '';

  const lastMuscles = analysis.lastWorkoutMuscleGroups;

  if (lastMuscles.includes('chest') || lastMuscles.includes('shoulders')) {
    // Yesterday/last session was Push -> Do Pull or Legs
    if (analysis.recentMuscleFrequency.back <= analysis.recentMuscleFrequency.legs) {
      selectedTemplateKey = 'pull';
      reasoning = 'Suggested because you trained chest & shoulders in your last workout.';
    } else {
      selectedTemplateKey = 'legs';
      reasoning = 'Suggested because you trained upper body pushing in your last workout.';
    }
  } else if (lastMuscles.includes('back')) {
    // Yesterday/last session was Pull -> Do Legs or Push
    selectedTemplateKey = 'legs';
    reasoning = 'Suggested because you trained back & pulling in your last workout.';
  } else if (lastMuscles.includes('legs')) {
    // Yesterday/last session was Legs -> Do Push
    selectedTemplateKey = 'push';
    reasoning = 'Suggested because you trained legs in your last workout.';
  } else {
    // General rotation or long break
    selectedTemplateKey = 'full_body';
    reasoning = 'Comprehensive full-body routine to re-engage all major muscle groups.';
  }

  const template = ROUTINES[selectedTemplateKey];

  return {
    type: 'workout',
    title: template.title,
    subtitle: template.subtitle,
    primaryMuscleGroup: template.primaryMuscleGroup,
    explanation: reasoning,
    isPersonalized: true,
    isRestDay: false,
    exercises: template.exercises.map((name) =>
      buildRecommendedExerciseItem(name, workouts, preferredUnit)
    ),
    generatedForDate: localTodayKey,
  };
}

/**
 * Replaces an individual exercise with a suggested alternative variation.
 */
export function swapRecommendedExercise(
  current: DailyWorkoutRecommendation,
  exerciseId: string,
  newExerciseName: string,
  workouts: Workout[],
  preferredUnit: WeightUnit
): DailyWorkoutRecommendation {
  const updatedExercises = current.exercises.map((item) => {
    if (item.id === exerciseId) {
      const newItem = buildRecommendedExerciseItem(newExerciseName, workouts, preferredUnit);
      return {
        ...newItem,
        explanation: `A variation of an exercise you have performed previously.`,
      };
    }
    return item;
  });

  return {
    ...current,
    exercises: updatedExercises,
  };
}

/**
 * Skips/removes an individual exercise from today's recommendation.
 */
export function skipRecommendedExercise(
  current: DailyWorkoutRecommendation,
  exerciseId: string
): DailyWorkoutRecommendation {
  return {
    ...current,
    exercises: current.exercises.filter((item) => item.id !== exerciseId),
  };
}
