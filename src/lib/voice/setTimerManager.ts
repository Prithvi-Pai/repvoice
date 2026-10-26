/**
 * Per-Set Duration Timer Manager
 * Calculates precise durations using monotonic timestamp differences (Date.now() - startedAt),
 * making timers completely resilient to React re-renders, browser tab throttling, and backgrounding.
 */

export interface ActiveSetTimerState {
  exerciseId: string;
  setNumber: number;
  startedAt: string;       // ISO string
  startedAtMs: number;     // Monotonic reference
  isRunning: boolean;
  status: 'in_progress' | 'completed' | 'cancelled';
}

export interface CompletedSetTiming {
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  formattedDuration: string;
}

/**
 * Starts a new set timer.
 */
export function startSetTimer(exerciseId: string, setNumber: number): ActiveSetTimerState {
  const now = Date.now();
  return {
    exerciseId,
    setNumber,
    startedAt: new Date(now).toISOString(),
    startedAtMs: now,
    isRunning: true,
    status: 'in_progress',
  };
}

/**
 * Calculates current elapsed duration in seconds for an active set timer.
 */
export function getElapsedSetSeconds(timer: ActiveSetTimerState | null): number {
  if (!timer || !timer.isRunning || timer.status !== 'in_progress') return 0;
  return Math.max(0, Math.floor((Date.now() - timer.startedAtMs) / 1000));
}

/**
 * Completes an active set timer and computes final duration.
 */
export function completeSetTimer(timer: ActiveSetTimerState): CompletedSetTiming {
  const completionMs = Date.now();
  const durationSec = Math.max(1, Math.floor((completionMs - timer.startedAtMs) / 1000));
  return {
    startedAt: timer.startedAt,
    completedAt: new Date(completionMs).toISOString(),
    durationSeconds: durationSec,
    formattedDuration: formatSetDuration(durationSec),
  };
}

/**
 * Formats duration in seconds into readable "Xm Ys" or "Xs" format.
 */
export function formatSetDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  if (mins === 0) {
    return `${remainingSecs}s`;
  }
  return `${mins}m ${remainingSecs}s`;
}

/**
 * Formats duration into detailed "1 min 24 sec" format for summaries.
 */
export function formatSetDurationLong(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0 sec';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} sec`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs} sec`;
}
