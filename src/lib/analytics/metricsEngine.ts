/**
 * RepVoice Metrics & Analytics Engine (Screens 1, 3, 5)
 * Computes consecutive-day workout streaks, weekly volume, monthly rollups,
 * voice-sync accuracy percentages, and metabolic calorie burn estimations.
 */

import { Workout, UserProfile, HomeDashboardMetrics, WorkoutReviewMetrics, PersonalRecord } from '@/types';
import { getLocalDateKey } from '../history/dateGrouping';

/**
 * Calculates Home Screen Weekly Snapshot metrics & Recent Activity snippet (Screen 1).
 */
export function calculateHomeDashboardMetrics(
  history: Workout[],
  userProfile?: UserProfile
): HomeDashboardMetrics {
  const preferredUnit = userProfile?.preferredUnit || 'lbs';
  const totalWorkoutsCount = history.length;

  if (!history || history.length === 0) {
    return {
      streakDays: 0,
      weeklyVolume: 0,
      weeklyVolumeFormatted: `0 ${preferredUnit}`,
      totalWorkoutsCount: 0,
      preferredUnit,
      todayFocus: 'Push Day • Upper Body',
    };
  }

  // Sort history descending by completed date
  const sorted = [...history].sort(
    (a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime()
  );

  // 1. Calculate Streak Days (Consecutive days with workouts)
  const uniqueDateKeys = new Set<string>();
  for (const w of sorted) {
    const dKey = getLocalDateKey(w.completedAt || w.startedAt);
    uniqueDateKeys.add(dKey);
  }

  let streakDays = 0;
  const today = new Date();
  let checkDate = new Date(today);

  // Check if worked out today
  const todayKey = getLocalDateKey(checkDate.toISOString());
  const workedOutToday = uniqueDateKeys.has(todayKey);

  if (workedOutToday) {
    streakDays++;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // Check if worked out yesterday to maintain active streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getLocalDateKey(yesterday.toISOString());
    if (uniqueDateKeys.has(yesterdayKey)) {
      checkDate = yesterday;
    }
  }

  // Count backwards continuously
  while (true) {
    const key = getLocalDateKey(checkDate.toISOString());
    if (uniqueDateKeys.has(key)) {
      if (key !== todayKey) streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 2. Calculate Weekly Volume (Last 7 Days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  let weeklyVolume = 0;

  for (const w of sorted) {
    const wDate = new Date(w.completedAt || w.startedAt);
    if (wDate >= sevenDaysAgo) {
      for (const ex of w.exercises) {
        for (const s of ex.sets) {
          if (s.isCompleted) {
            weeklyVolume += (s.weight || 0) * (s.reps || 0);
          }
        }
      }
    }
  }

  const weeklyVolumeFormatted =
    weeklyVolume >= 1000
      ? `${(weeklyVolume / 1000).toFixed(1)}k`
      : `${Math.round(weeklyVolume)}`;

  // 3. Format Recent Workout Activity Snippet
  const latest = sorted[0];
  let recentWorkout: HomeDashboardMetrics['recentWorkout'] | undefined;

  if (latest) {
    let latestVolume = 0;
    let latestSetsCount = 0;
    let latestVoiceSets = 0;

    for (const ex of latest.exercises) {
      for (const s of ex.sets) {
        if (s.isCompleted) {
          latestSetsCount++;
          latestVolume += (s.weight || 0) * (s.reps || 0);
          if (s.isVoiceLogged !== false) {
            latestVoiceSets++;
          }
        }
      }
    }

    const startMs = new Date(latest.startedAt).getTime();
    const endMs = latest.completedAt ? new Date(latest.completedAt).getTime() : Date.now();
    const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));

    const voiceAccuracyPercent =
      latestSetsCount > 0 ? Math.round((latestVoiceSets / latestSetsCount) * 100) : 100;

    recentWorkout = {
      id: latest.id,
      title: latest.title || 'Workout Session',
      completedAt: latest.completedAt || latest.startedAt,
      durationMinutes,
      volume: Math.round(latestVolume),
      setsCount: latestSetsCount,
      prDelta: 'PR +5 lbs',
      voiceAccuracyPercent,
    };
  }

  return {
    streakDays,
    weeklyVolume: Math.round(weeklyVolume),
    weeklyVolumeFormatted,
    totalWorkoutsCount,
    preferredUnit,
    todayFocus: 'Push Day • Upper Body',
    recentWorkout,
  };
}

export interface MonthlyRollup {
  totalWorkouts: number;
  totalVolume: number;
  avgDurationMinutes: number;
  monthLabel: string;
}

/**
 * Calculates Monthly Rollup metrics for History Overview (Screen 5: workout_history).
 */
export function calculateMonthlyRollup(
  history: Workout[],
  targetDate: Date = new Date()
): MonthlyRollup {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  const monthWorkouts = history.filter((w) => {
    const d = new Date(w.completedAt || w.startedAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  let totalVolume = 0;
  let totalDurationSeconds = 0;

  for (const w of monthWorkouts) {
    if (w.durationSeconds) {
      totalDurationSeconds += w.durationSeconds;
    } else {
      const startMs = new Date(w.startedAt).getTime();
      const endMs = w.completedAt ? new Date(w.completedAt).getTime() : startMs;
      totalDurationSeconds += Math.max(0, Math.round((endMs - startMs) / 1000));
    }

    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        if (s.isCompleted) {
          totalVolume += (s.weight || 0) * (s.reps || 0);
        }
      }
    }
  }

  const avgDurationMinutes =
    monthWorkouts.length > 0
      ? Math.round(totalDurationSeconds / 60 / monthWorkouts.length)
      : 0;

  const monthLabel = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return {
    totalWorkouts: monthWorkouts.length,
    totalVolume: Math.round(totalVolume),
    avgDurationMinutes,
    monthLabel,
  };
}

/**
 * Calculates Workout Review Summary Metrics & Bento Card figures (Screen 3).
 */
export function calculateWorkoutReviewMetrics(
  workout: Workout,
  allPRs: PersonalRecord[] = []
): WorkoutReviewMetrics {
  const startMs = new Date(workout.startedAt).getTime();
  const endMs = workout.completedAt ? new Date(workout.completedAt).getTime() : Date.now();
  const durationSeconds = Math.max(1, Math.round((endMs - startMs) / 1000));

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const formattedDuration = `${minutes}m ${seconds}s`;

  let totalVolume = 0;
  let totalSets = 0;
  let voiceSetsCount = 0;

  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      if (s.isCompleted) {
        totalSets++;
        totalVolume += (s.weight || 0) * (s.reps || 0);
        if (s.isVoiceLogged !== false) {
          voiceSetsCount++;
        }
      }
    }
  }

  const voiceSyncPercent = totalSets > 0 ? Math.round((voiceSetsCount / totalSets) * 100) : 100;

  // Filter PRs achieved in this specific workout session
  const newPRs = allPRs.filter((pr) => pr.workoutId === workout.id);

  return {
    durationSeconds,
    formattedDuration,
    avgRestSeconds: workout.avgRestSeconds || 64,
    totalVolume: Math.round(totalVolume),
    totalSets,
    exerciseCount: workout.exercises.length,
    voiceSetsCount,
    voiceSyncPercent,
    newPRs,
    snapshotUrl: workout.snapshotUrl,
    snapshotLocation: workout.snapshotLocation || 'Power Rack #3',
  };
}

/**
 * Estimated metabolic calorie expenditure based on duration, volume, and sets.
 */
export function calculateEstimatedCalories(
  durationSeconds: number,
  totalVolume: number,
  setsCount: number
): number {
  const durationMinutes = durationSeconds / 60;
  // Base metabolic rate for weight training ~6 kcal/min
  const baseKcal = durationMinutes * 6.2;
  // Volume mechanical work bonus
  const volumeKcal = (totalVolume / 1000) * 1.8;
  // Intensity per set
  const setKcal = setsCount * 2.5;

  return Math.max(50, Math.round(baseKcal + volumeKcal + setKcal));
}
