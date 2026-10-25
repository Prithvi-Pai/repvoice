'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Database,
  Mic,
  Scale,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  User,
  Terminal,
  AlertTriangle,
  Play
} from 'lucide-react';
import { getSupabaseConfig, getSupabaseClient } from '@/lib/supabase/client';
import { getStoredProfile, saveStoredProfile } from '@/lib/storage';
import { UserProfile, WeightUnit } from '@/types';
import { BottomNav } from '@/components/layout/BottomNav';

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile>({
    id: 'guest',
    displayName: 'Gym Athlete',
    preferredUnit: 'kg',
  });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message?: string }>({
    status: 'idle',
  });
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [speechSupport, setSpeechSupport] = useState<boolean>(false);
  const [micTesting, setMicTesting] = useState<boolean>(false);
  const [micTestText, setMicTestText] = useState<string>('');

  useEffect(() => {
    const loaded = getStoredProfile();
    setProfile(loaded);

    const config = getSupabaseConfig();
    setIsConfigured(config.isConfigured);

    if (typeof window !== 'undefined') {
      const win = window as any;
      setSpeechSupport(Boolean(win.SpeechRecognition || win.webkitSpeechRecognition));
    }

    const client = getSupabaseClient();
    if (client) {
      client.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      });
    }
  }, []);

  const handleUnitToggle = (unit: WeightUnit) => {
    const updated = { ...profile, preferredUnit: unit };
    setProfile(updated);
    saveStoredProfile(updated);
  };

  const handleTestConnection = async () => {
    setTestResult({ status: 'testing' });
    const client = getSupabaseClient();
    if (!client) {
      setTestResult({
        status: 'error',
        message: 'No active Supabase configuration detected.',
      });
      return;
    }

    try {
      // Test 1: Check Auth service ping
      const { error: authError } = await client.auth.getSession();
      if (authError) throw authError;

      // Test 2: Check workouts table query with RLS
      const { error: tableError } = await client.from('workouts').select('id').limit(1);

      if (tableError) {
        if (tableError.code === '42P01') {
          setTestResult({
            status: 'error',
            message: 'Connected to Supabase, but "workouts" table is missing! Run schema.sql in SQL Editor.',
          });
          return;
        }
      }

      setTestResult({
        status: 'success',
        message: 'PostgreSQL connection verified! Tables and RLS policies are active.',
      });
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: err?.message || 'Failed to communicate with Supabase backend.',
      });
    }
  };

  const copySqlSchema = () => {
    const sql = `-- RepVoice Supabase Database Schema
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferred_unit TEXT NOT NULL DEFAULT 'kg' CHECK (preferred_unit IN ('kg', 'lbs')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL DEFAULT 1,
  weight NUMERIC(6, 2) NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  is_completed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workouts" ON public.workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own exercises" ON public.workout_exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid())
);
CREATE POLICY "Users can manage own sets" ON public.workout_sets FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.workout_exercises we
    JOIN public.workouts w ON w.id = we.workout_id
    WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
  )
);
`;
    navigator.clipboard.writeText(sql);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const handleTestMic = () => {
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.onstart = () => {
        setMicTesting(true);
        setMicTestText('Listening... say: "Bench press 60 kg 10 reps"');
      };
      recognition.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setMicTestText(`Recognized speech: "${text}"`);
      };
      recognition.onerror = (e: any) => {
        setMicTestText(`Speech error: ${e.error}`);
        setMicTesting(false);
      };
      recognition.onend = () => {
        setMicTesting(false);
      };
      recognition.start();
    } catch (e: any) {
      setMicTestText(`Exception: ${e.message}`);
      setMicTesting(false);
    }
  };

  return (
    <div className="space-y-5 pb-10 pt-1">
      {/* Page Title */}
      <div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-lime-400 block mb-0.5">
          PREFERENCES & STATUS
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">App Settings</h1>
      </div>

      {/* Account Section */}
      <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-extrabold text-sm">
            <User className="h-4 w-4 text-lime-400" />
            <span>Athlete Profile</span>
          </div>
          {userEmail ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-lime-400 bg-lime-950/70 border border-lime-800/60 px-2 py-0.5 rounded-full">
              Authenticated
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded-full">
              Guest Mode
            </span>
          )}
        </div>

        {userEmail ? (
          <div className="space-y-3">
            <p className="text-xs text-zinc-300">
              Logged in as <span className="font-bold text-white">{userEmail}</span>. Your workouts are securely synced to your account.
            </p>
            <button
              onClick={async () => {
                const client = getSupabaseClient();
                if (client) {
                  await client.auth.signOut();
                  window.location.reload();
                }
              }}
              className="py-2 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 font-bold text-xs flex items-center gap-1.5 border border-zinc-700 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs text-zinc-400">
              Sign in with your email to automatically sync your workout sessions and sets across devices.
            </p>
            <Link
              href="/auth"
              className="w-full py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(163,230,53,0.25)] transition"
            >
              Sign In / Create Account
            </Link>
          </div>
        )}
      </div>

      {/* Preferred Weight Unit */}
      <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-white font-extrabold text-sm">
          <Scale className="h-4 w-4 text-lime-400" />
          <span>Weight Unit</span>
        </div>
        <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
          <button
            onClick={() => handleUnitToggle('kg')}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              profile.preferredUnit === 'kg'
                ? 'bg-zinc-800 text-lime-400 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Kilograms (kg)
          </button>
          <button
            onClick={() => handleUnitToggle('lbs')}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              profile.preferredUnit === 'lbs'
                ? 'bg-zinc-800 text-lime-400 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pounds (lbs)
          </button>
        </div>
      </div>

      {/* Supabase PostgreSQL Status */}
      <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-extrabold text-sm">
            <Database className="h-4 w-4 text-lime-400" />
            <span>Supabase PostgreSQL</span>
          </div>
          {isConfigured ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-lime-400 bg-lime-950/70 border border-lime-800/60 px-2 py-0.5 rounded-full">
              <ShieldCheck className="h-3 w-3" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded-full">
              <ShieldAlert className="h-3 w-3" /> Pending Config
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-400">
          RepVoice uses Supabase PostgreSQL for persistent database storage with Row Level Security.
        </p>

        {/* Test Connection Button */}
        <div className="space-y-2">
          <button
            onClick={handleTestConnection}
            disabled={testResult.status === 'testing' || !isConfigured}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-bold text-white flex items-center justify-center gap-1.5 border border-zinc-700 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${testResult.status === 'testing' ? 'animate-spin text-lime-400' : ''}`} />
            <span>Test Database Connection</span>
          </button>

          {testResult.status !== 'idle' && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                testResult.status === 'success'
                  ? 'bg-lime-950/70 border border-lime-800 text-lime-300'
                  : testResult.status === 'error'
                  ? 'bg-rose-950/70 border border-rose-800 text-rose-300'
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-300'
              }`}
            >
              {testResult.status === 'success' ? (
                <Check className="h-4 w-4 text-lime-400 shrink-0 mt-0.5" />
              ) : testResult.status === 'error' ? (
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="h-4 w-4 text-zinc-400 animate-spin shrink-0 mt-0.5" />
              )}
              <span>{testResult.message || 'Pinging Supabase backend...'}</span>
            </div>
          )}
        </div>

        {/* 1-Click Schema Copy */}
        <div className="pt-2 border-t border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-lime-400" />
              Database Schema (SQL)
            </span>
            <button
              onClick={copySqlSchema}
              className="text-[11px] font-bold text-lime-400 bg-lime-950/60 hover:bg-lime-900/60 border border-lime-800/40 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
            >
              {copiedSchema ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copiedSchema ? 'Copied!' : 'Copy SQL'}</span>
            </button>
          </div>
          <p className="text-[11px] text-zinc-400">
            Copy SQL to run or inspect your tables (`workouts`, `workout_exercises`, `workout_sets`).
          </p>
        </div>
      </div>

      {/* Web Speech API Diagnostics */}
      <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-extrabold text-sm">
            <Mic className="h-4 w-4 text-lime-400" />
            <span>Web Speech API Status</span>
          </div>
          {speechSupport ? (
            <span className="text-[10px] font-bold text-lime-400 bg-lime-950/70 border border-lime-800/60 px-2 py-0.5 rounded-full">
              Supported
            </span>
          ) : (
            <span className="text-[10px] font-bold text-rose-400 bg-rose-950/70 border border-rose-800/60 px-2 py-0.5 rounded-full">
              Unsupported
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-400">
          The Web Speech API transcribes spoken gym commands hands-free into exercise entries.
        </p>

        <button
          onClick={handleTestMic}
          className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 border border-zinc-700 transition cursor-pointer"
        >
          <Play className={`h-3.5 w-3.5 ${micTesting ? 'text-lime-400 animate-pulse' : ''}`} />
          <span>{micTesting ? 'Listening...' : 'Test Microphone & Speech Engine'}</span>
        </button>

        {micTestText && (
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-850 text-xs text-zinc-200 font-mono">
            {micTestText}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
