import { getSupabaseClient } from '@/lib/supabase/client';

const LOCAL_STORAGE_ALIASES_KEY = 'repvoice_custom_aliases';
const LOCAL_STORAGE_EXERCISES_KEY = 'repvoice_custom_exercises';

export interface SaveAliasResult {
  success: boolean;
  persistedTo: 'supabase' | 'local_only';
  error?: string;
}

/**
 * Normalizes an alias string (lowercase, trimmed, collapsed whitespace)
 */
export function normalizeAliasText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats a string to Title Case (e.g. "chest press" -> "Chest Press")
 */
export function toTitleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Retrieves custom aliases saved locally in the browser
 */
export function getLocalCustomAliases(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ALIASES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('Failed to read local aliases from localStorage', err);
    return {};
  }
}

/**
 * Retrieves custom exercise names saved locally
 */
export function getLocalCustomExercises(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EXERCISES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to read local exercises from localStorage', err);
    return [];
  }
}

/**
 * Fetches all user aliases from Supabase and merges them with local cache
 */
export async function syncAndLoadAllAliases(): Promise<Record<string, string>> {
  const localMap = getLocalCustomAliases();
  const client = getSupabaseClient();
  if (!client) return localMap;

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return localMap;

    // Fetch aliases with parent exercise canonical name
    const { data, error } = await client
      .from('exercise_aliases')
      .select('alias_text, exercises(canonical_name)')
      .eq('user_id', user.id);

    if (error) {
      // Table may not be migrated yet or offline; fallback to local
      console.warn('Supabase alias fetch failed (using local cache):', error.message);
      return localMap;
    }

    if (data && Array.isArray(data)) {
      const merged = { ...localMap };
      for (const row of data as any[]) {
        const canonical = row.exercises?.canonical_name;
        if (row.alias_text && canonical) {
          merged[normalizeAliasText(row.alias_text)] = canonical;
        }
      }
      // Update local cache with cloud records
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_ALIASES_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Network error while syncing aliases with Supabase:', err);
  }

  return localMap;
}

/**
 * Saves a confirmed exercise and alias to Supabase and localStorage.
 * Checks for existing entries before inserting to prevent duplicates.
 */
export async function saveLearnedAlias(
  spokenPhrase: string,
  canonicalName: string,
  category: string = 'General'
): Promise<SaveAliasResult> {
  const normAlias = normalizeAliasText(spokenPhrase);
  const cleanCanonical = toTitleCase(canonicalName);

  if (!normAlias || !cleanCanonical) {
    return { success: false, persistedTo: 'local_only', error: 'Invalid alias or exercise name' };
  }

  // 1. Immediately save to localStorage so subsequent utterances recognize it instantly
  try {
    if (typeof window !== 'undefined') {
      const localAliases = getLocalCustomAliases();
      localAliases[normAlias] = cleanCanonical;
      localStorage.setItem(LOCAL_STORAGE_ALIASES_KEY, JSON.stringify(localAliases));

      const localExercises = getLocalCustomExercises();
      if (!localExercises.some((e) => e.toLowerCase() === cleanCanonical.toLowerCase())) {
        localExercises.push(cleanCanonical);
        localStorage.setItem(LOCAL_STORAGE_EXERCISES_KEY, JSON.stringify(localExercises));
      }
    }
  } catch (err) {
    console.warn('Failed to save alias locally:', err);
  }

  // 2. Persist to Supabase if authenticated
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: true,
      persistedTo: 'local_only',
      error: 'Supabase not configured. Saved to local storage.',
    };
  }

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return {
        success: true,
        persistedTo: 'local_only',
        error: 'Not signed in. Alias saved locally in browser.',
      };
    }

    // Step A: Find or insert canonical exercise
    let exerciseId: string | null = null;
    const { data: existingEx, error: exSelectError } = await client
      .from('exercises')
      .select('id, canonical_name')
      .eq('user_id', user.id)
      .ilike('canonical_name', cleanCanonical)
      .maybeSingle();

    if (exSelectError) {
      console.warn('Supabase exercise lookup error:', exSelectError.message);
      return {
        success: true,
        persistedTo: 'local_only',
        error: `Saved locally. Cloud sync: ${exSelectError.message}`,
      };
    }

    if (existingEx) {
      exerciseId = existingEx.id;
    } else {
      const { data: newEx, error: exInsertError } = await client
        .from('exercises')
        .insert({
          user_id: user.id,
          canonical_name: cleanCanonical,
          category,
        })
        .select('id')
        .single();

      if (exInsertError) {
        console.warn('Supabase exercise insert error:', exInsertError.message);
        return {
          success: true,
          persistedTo: 'local_only',
          error: `Saved locally. Cloud sync: ${exInsertError.message}`,
        };
      }
      exerciseId = newEx.id;
    }

    // Step B: Find or insert alias under this exercise
    if (exerciseId) {
      const { data: existingAlias } = await client
        .from('exercise_aliases')
        .select('id')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .ilike('alias_text', normAlias)
        .maybeSingle();

      if (!existingAlias) {
        const { error: aliasInsertError } = await client
          .from('exercise_aliases')
          .insert({
            exercise_id: exerciseId,
            user_id: user.id,
            alias_text: normAlias,
          });

        if (aliasInsertError) {
          console.warn('Supabase alias insert error:', aliasInsertError.message);
          return {
            success: true,
            persistedTo: 'local_only',
            error: `Saved locally. Cloud sync: ${aliasInsertError.message}`,
          };
        }
      }
    }

    return {
      success: true,
      persistedTo: 'supabase',
    };
  } catch (err: any) {
    console.warn('Unexpected error saving alias to Supabase:', err);
    return {
      success: true,
      persistedTo: 'local_only',
      error: 'Saved locally. Network error contacting Supabase.',
    };
  }
}
