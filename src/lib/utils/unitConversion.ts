import { WeightUnit } from '@/types';

export const LBS_PER_KG = 2.20462262;
export const KG_PER_LB = 0.45359237;

/**
 * Converts a weight value from a source unit to a target unit.
 * If units are identical or unspecified, returns the original weight.
 */
export function convertWeight(
  weight: number | undefined | null,
  fromUnit: WeightUnit | string | undefined | null,
  toUnit: WeightUnit
): number {
  if (weight === undefined || weight === null || isNaN(weight)) return 0;
  const num = Number(weight);
  if (num === 0) return 0;

  const sourceNormalized = String(fromUnit || toUnit || 'kg').toLowerCase().includes('lb')
    ? 'lbs'
    : 'kg';

  if (sourceNormalized === toUnit) {
    return num;
  }

  if (sourceNormalized === 'lbs' && toUnit === 'kg') {
    return num * KG_PER_LB;
  }

  if (sourceNormalized === 'kg' && toUnit === 'lbs') {
    return num * LBS_PER_KG;
  }

  return num;
}

/**
 * Calculates a single set's volume normalized to the athlete's target preferred unit.
 * Set Volume = Converted Weight * Repetitions.
 */
export function calculateSetVolume(
  weight: number | undefined | null,
  reps: number | undefined | null,
  setUnit: WeightUnit | string | undefined | null,
  targetUnit: WeightUnit
): number {
  if (weight === undefined || weight === null || reps === undefined || reps === null) return 0;
  const convertedWeight = convertWeight(weight, setUnit, targetUnit);
  const repCount = Math.max(0, Number(reps) || 0);
  return convertedWeight * repCount;
}

/**
 * Formats a volume number cleanly with k/M suffixes or localized separators.
 */
export function formatVolumeValue(volume: number): string {
  if (!volume || isNaN(volume) || volume <= 0) return '0';
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 10000) {
    return `${(volume / 1000).toFixed(1)}k`;
  }
  return Math.round(volume).toLocaleString();
}
