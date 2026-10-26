/**
 * Local Date Boundary & History Grouping Engine
 * Calculates local midnight boundaries in the athlete's local browser timezone,
 * ensuring workouts are accurately partitioned into "Today", "Yesterday", and Historical Dates.
 */

import { Workout } from '../../types';

export interface GroupedWorkouts {
  today: Workout[];
  yesterday: Workout[];
  older: Workout[];
}

/**
 * Returns a local date key in YYYY-MM-DD format for a given timestamp or date.
 */
export function getLocalDateKey(isoDateOrMs: string | number | Date): string {
  const d = new Date(isoDateOrMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's and yesterday's local date keys.
 */
export function getTodayAndYesterdayKeys(): { todayKey: string; yesterdayKey: string } {
  const now = new Date();
  const todayKey = getLocalDateKey(now);

  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterdayDate);

  return { todayKey, yesterdayKey };
}

/**
 * Groups an array of workouts into Today, Yesterday, and Older sections based on local timezone.
 */
export function groupWorkoutsByDate(workouts: Workout[]): GroupedWorkouts {
  const { todayKey, yesterdayKey } = getTodayAndYesterdayKeys();

  const grouped: GroupedWorkouts = {
    today: [],
    yesterday: [],
    older: [],
  };

  for (const w of workouts) {
    const workoutDateKey = getLocalDateKey(w.startedAt || w.completedAt || new Date());

    if (workoutDateKey === todayKey) {
      grouped.today.push(w);
    } else if (workoutDateKey === yesterdayKey) {
      grouped.yesterday.push(w);
    } else {
      grouped.older.push(w);
    }
  }

  return grouped;
}

/**
 * Filters workouts matching a specific local date key (YYYY-MM-DD).
 */
export function filterWorkoutsBySpecificDate(workouts: Workout[], targetDateKey: string): Workout[] {
  return workouts.filter((w) => {
    const workoutDateKey = getLocalDateKey(w.startedAt || w.completedAt || new Date());
    return workoutDateKey === targetDateKey;
  });
}

/**
 * Formats a local date key into a readable human label (e.g. "Monday, Oct 26, 2026").
 */
export function formatLocalDateLabel(dateKey: string): string {
  const parts = dateKey.split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3) return dateKey;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
