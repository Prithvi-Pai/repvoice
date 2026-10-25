import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project configuration (safe public anon client)
const DEFAULT_SUPABASE_URL = 'https://fpricuqhdhlpsnasnoso.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwcmljdXFoZGhscHNuYXNub3NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MTQxODgsImV4cCI6MjEwODQ5MDE4OH0.WlCiEvwUUmgtyk9tukTJ__D48uv2zMtOHSK4vlgYoeY';

export function cleanSupabaseUrl(rawUrl: string): string {
  let cleaned = (rawUrl || '').trim().replace(/\/+$/, '');
  if (cleaned.endsWith('/rest/v1')) {
    cleaned = cleaned.slice(0, -'/rest/v1'.length);
  }
  return cleaned.replace(/\/+$/, '');
}

const rawEnvUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const envUrl = cleanSupabaseUrl(rawEnvUrl) || DEFAULT_SUPABASE_URL;
const envAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || DEFAULT_SUPABASE_ANON_KEY;

export function checkIsSupabaseConfigured(): boolean {
  return Boolean(
    envUrl &&
    envAnonKey &&
    !envUrl.includes('your-project') &&
    envUrl.startsWith('https://')
  );
}

export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  return {
    url: envUrl,
    anonKey: envAnonKey,
    isConfigured: checkIsSupabaseConfigured(),
  };
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return null;

  if (cachedClient) return cachedClient;

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export const isSupabaseConfigured = checkIsSupabaseConfigured();
export const supabase = getSupabaseClient();
