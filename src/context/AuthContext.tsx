'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSession = useCallback(async () => {
    try {
      const client = getSupabaseClient();
      if (!client) {
        setUser(null);
        setSession(null);
        setIsLoading(false);
        return;
      }

      // Check current stored session from localStorage
      const { data, error } = await client.auth.getSession();
      if (error) {
        console.warn('[RepVoice Auth] Error getting session:', error.message);
        setUser(null);
        setSession(null);
      } else if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (err) {
      console.warn('[RepVoice Auth] Session verification exception:', err);
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();

    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    // Subscribe to real-time auth changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, currentSession) => {
      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
      } else {
        setSession(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSession]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      // Auto-save any active workout on logout so the timer stops and session is safely preserved
      if (typeof window !== 'undefined') {
        try {
          const { autoSaveActiveWorkout } = await import('@/lib/storage');
          await autoSaveActiveWorkout('logout');
        } catch (saveErr) {
          console.warn('[RepVoice Auth] Notice while auto-saving workout on signOut:', saveErr);
        }
      }
      const client = getSupabaseClient();
      if (client) {
        await client.auth.signOut();
      }
    } catch (err) {
      console.warn('[RepVoice Auth] Error during signOut:', err);
    } finally {
      setUser(null);
      setSession(null);
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      signOut,
      refreshSession: fetchSession,
    }),
    [user, session, isLoading, signOut, fetchSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
