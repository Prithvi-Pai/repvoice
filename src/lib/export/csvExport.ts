import { Workout } from '@/types';
import { getWorkoutMuscleGroupsSummary } from '../exercises/muscleGroupStore';

/**
 * Escapes fields for standard CSV formatting (RFC 4180).
 */
function escapeCSV(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Converts workouts into tabular CSV rows.
 */
export function generateWorkoutsCSV(workouts: Workout[]): string {
  const headers = [
    'Workout ID',
    'Date',
    'Workout Title',
    'Duration (min)',
    'Target Muscle Groups',
    'Exercise Name',
    'Set Number',
    'Weight',
    'Unit',
    'Reps',
    'Set Duration (s)',
    'Completed',
  ];

  const rows: string[] = [headers.join(',')];

  for (const w of workouts) {
    const workoutDate = new Date(w.startedAt).toLocaleDateString();
    const durationMin = w.durationSeconds ? Math.round(w.durationSeconds / 60) : '';
    const muscleSummary = w.muscleGroupDescription || getWorkoutMuscleGroupsSummary(w);

    if (!w.exercises || w.exercises.length === 0) {
      rows.push(
        [
          escapeCSV(w.id),
          escapeCSV(workoutDate),
          escapeCSV(w.title),
          escapeCSV(durationMin),
          escapeCSV(muscleSummary),
          escapeCSV('None'),
          escapeCSV(''),
          escapeCSV(''),
          escapeCSV(''),
          escapeCSV(''),
          escapeCSV(''),
          escapeCSV(''),
        ].join(',')
      );
      continue;
    }

    for (const ex of w.exercises) {
      if (!ex.sets || ex.sets.length === 0) {
        rows.push(
          [
            escapeCSV(w.id),
            escapeCSV(workoutDate),
            escapeCSV(w.title),
            escapeCSV(durationMin),
            escapeCSV(muscleSummary),
            escapeCSV(ex.exerciseName),
            escapeCSV(''),
            escapeCSV(''),
            escapeCSV(''),
            escapeCSV(''),
            escapeCSV(''),
            escapeCSV(''),
          ].join(',')
        );
        continue;
      }

      for (const s of ex.sets) {
        rows.push(
          [
            escapeCSV(w.id),
            escapeCSV(workoutDate),
            escapeCSV(w.title),
            escapeCSV(durationMin),
            escapeCSV(muscleSummary),
            escapeCSV(ex.exerciseName),
            escapeCSV(s.setNumber),
            escapeCSV(s.weight),
            escapeCSV(s.unit),
            escapeCSV(s.reps),
            escapeCSV(s.durationSeconds || ''),
            escapeCSV(s.isCompleted !== false ? 'Yes' : 'No'),
          ].join(',')
        );
      }
    }
  }

  return rows.join('\r\n');
}

/**
 * Triggers a browser download of the workouts CSV file.
 */
export function downloadWorkoutsCSV(workouts: Workout[]): { success: boolean; filename: string; count: number } {
  if (typeof window === 'undefined') return { success: false, filename: '', count: 0 };

  const csvContent = generateWorkoutsCSV(workouts);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const filename = `repvoice_workout_export_${dateStr}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, filename, count: workouts.length };
}

/**
 * Triggers a browser download of the full raw JSON workout data.
 */
export function downloadWorkoutsJSON(workouts: Workout[]): { success: boolean; filename: string; count: number } {
  if (typeof window === 'undefined') return { success: false, filename: '', count: 0 };

  const jsonContent = JSON.stringify(workouts, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const filename = `repvoice_workout_export_${dateStr}.json`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, filename, count: workouts.length };
}
