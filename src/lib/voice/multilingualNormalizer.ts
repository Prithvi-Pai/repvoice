/**
 * Multilingual Normalizer & Script Preserver for RepVoice
 * Supports English, Hindi (Devanagari), Kannada, Hinglish, and transliterated scripts.
 */

export type SupportedScript = 'latin' | 'devanagari' | 'kannada' | 'other';

/**
 * Normalizes text while preserving Unicode characters across scripts.
 * Unlike ASCII \w regexes, this uses Unicode property escapes (\p{L}, \p{N})
 * so Hindi (छाती), Kannada (ಎದೆ), and other languages are preserved.
 */
export function normalizeMultilingualText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  try {
    // Preserve Unicode letters (\p{L}), combining marks/matras (\p{M}), numbers (\p{N}), spaces, and hyphens.
    // Indic scripts (Hindi, Kannada) rely fundamentally on \p{M} for vowels and conjuncts (virama).
    const unicodeRegex = new RegExp('[^\\p{L}\\p{M}\\p{N}\\s-]', 'gu');
    return text
      .toLowerCase()
      .replace(unicodeRegex, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    // Fallback preserving Devanagari and Kannada ranges
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097F\u0C80-\u0CFF\s-]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * Detects the predominant script of an input string.
 */
export function detectScript(text: string): SupportedScript {
  if (!text) return 'latin';
  if (/[\u0900-\u097F]/.test(text)) return 'devanagari'; // Hindi / Sanskrit / Marathi
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kannada';    // Kannada
  if (/^[a-zA-Z0-9\s-]+$/.test(text)) return 'latin';
  return 'other';
}

/**
 * Built-in dictionary of multilingual exercise names and common gym phrases
 * in Hindi, Kannada, and Hinglish mapped to Canonical English exercise names.
 */
export const MULTILINGUAL_EXERCISE_SEED: Record<string, string> = {
  // Hindi (Devanagari)
  'छाती प्रेस': 'Chest Press',
  'डंबल प्रेस': 'Dumbbell Bench Press',
  'बेंच प्रेस': 'Bench Press',
  'डंबल रो': 'Dumbbell Row',
  'दंड': 'Push Ups',
  'बैठक': 'Squats',
  'कंधे की कसरत': 'Overhead Press',
  'बाइसेप कर्ल': 'Bicep Curl',
  'ट्राईसेप एक्सटेंशन': 'Tricep Extension',
  'डेडलिफ्ट': 'Deadlift',
  'पुल अप': 'Pull Ups',
  'लैट पुलडाउन': 'Lat Pulldown',

  // Kannada
  'ಎದೆ ಪ್ರೆಸ್': 'Chest Press',
  'ಬೆಂಚ್ ಪ್ರೆಸ್': 'Bench Press',
  'ಡಂಬಲ್ ಪ್ರೆಸ್': 'Dumbbell Bench Press',
  'ಸ್ಕ್ವಾಟ್ಸ್': 'Squats',
  'ಡೆಡ್‌ಲಿಫ್ಟ್': 'Deadlift',
  'ಪುಲ್ ಅಪ್': 'Pull Ups',
  'ಬೈಸೆಪ್ ಕರ್ಲ್': 'Bicep Curl',

  // Hinglish & Common Phonetic Transliterations
  'chest ki exercise': 'Chest Press',
  'chhati press': 'Chest Press',
  'chhati ki exercise': 'Chest Press',
  'kandha press': 'Overhead Press',
  'bicep ka set': 'Bicep Curl',
  'baithak': 'Squats',
  'dumble uthana': 'Dumbbell Bench Press',
  'dumble curl': 'Bicep Curl',
};

/**
 * Resolves a multilingual or transliterated exercise phrase.
 */
export function resolveMultilingualPhrase(
  phrase: string,
  customAliases: Record<string, string> = {}
): string | null {
  const normalized = normalizeMultilingualText(phrase);
  if (!normalized) return null;

  // 1. Check custom user vocabulary first
  if (customAliases[normalized]) {
    return customAliases[normalized];
  }

  // 2. Check built-in multilingual seed
  if (MULTILINGUAL_EXERCISE_SEED[normalized]) {
    return MULTILINGUAL_EXERCISE_SEED[normalized];
  }

  // 3. Phrase search for exact or phrase-contained matches (do not match partial sub-words backwards)
  for (const [key, canonical] of Object.entries(customAliases)) {
    if (normalized === key || normalized.includes(key)) {
      return canonical;
    }
  }

  for (const [key, canonical] of Object.entries(MULTILINGUAL_EXERCISE_SEED)) {
    if (normalized === key || normalized.includes(key)) {
      return canonical;
    }
  }

  return null;
}
