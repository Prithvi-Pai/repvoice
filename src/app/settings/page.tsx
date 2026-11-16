'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
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
  Play,
  Volume2,
  Bell,
  Sliders,
  Timer,
  Sparkles,
} from 'lucide-react';
import { getSupabaseConfig, getSupabaseClient } from '@/lib/supabase/client';
import { getStoredProfile, saveStoredProfile } from '@/lib/storage';
import { UserProfile, WeightUnit } from '@/types';
import { BottomNav } from '@/components/layout/BottomNav';
import { playAcousticChime, speakVoiceConfirmation } from '@/lib/voice/audioFeedback';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut: authSignOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    id: 'guest',
    displayName: 'Gym Athlete',
    preferredUnit: 'lbs',
    recognitionMode: 'continuous',
    spokenConfirmations: true,
    beepOnRecord: true,
    microphoneSensitivity: 'aggressive',
    defaultRestTimerSeconds: 90,
  });
  const userEmail = user?.email || null;
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
  }, []);

  const updateProfileSetting = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    const updated = { ...profile, [key]: value };
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
      const { error: authError } = await client.auth.getSession();
      if (authError) throw authError;

      const { error: tableError } = await client.from('workouts').select('id').limit(1);

      if (tableError) {
        if (tableError.code === '42P01') {
          setTestResult({
            status: 'error',
            message: 'Connected to Supabase, but "workouts" table is missing! Run migration in SQL Editor.',
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

  const handleTestMic = () => {
    if (typeof window === 'undefined') return;
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      setMicTesting(true);
      setMicTestText('Say something (e.g. "Bench press 185 lbs 8 reps")...');

      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setMicTestText(`Heard: "${text}"`);
        setMicTesting(false);
      };

      rec.onerror = (e: any) => {
        setMicTestText(`Microphone error: ${e.error}`);
        setMicTesting(false);
      };

      rec.onend = () => {
        setMicTesting(false);
      };

      rec.start();
    } catch (err: any) {
      setMicTestText(`Speech init error: ${err.message}`);
      setMicTesting(false);
    }
  };

  return (
    <div className="space-y-5 pb-28 pt-2 max-w-md mx-auto px-4 font-sans text-[#e2e2e8]">
      {/* Page Title */}
      <div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-0.5">
          Obsidian Settings
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">Audio & Preferences</h1>
      </div>

      {/* Account Section */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <User className="h-4 w-4 text-zinc-300" />
            <span>Athlete Profile</span>
          </div>
          {userEmail ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
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
              Logged in as <span className="font-bold text-white">{userEmail}</span>. Your workouts, routines, and PRs sync automatically.
            </p>
            <button
              onClick={async () => {
                await authSignOut();
                router.replace('/auth');
              }}
              className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400">
              Sign in with your email to sync workouts, routines, and personal records across all devices.
            </p>
            <Link
              href="/auth"
              className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_2px_15px_rgba(255,255,255,0.15)] transition"
            >
              Sign In / Create Account
            </Link>
          </div>
        )}
      </div>

      {/* Voice Recognition Mode (Continuous vs Push-to-Talk) */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Mic className="h-4 w-4 text-zinc-300" />
            <span>Voice Listening Mode</span>
          </div>
          <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-full uppercase border border-zinc-700">
            Hands-Free
          </span>
        </div>

        <div className="grid grid-cols-2 p-1 rounded-xl bg-black border border-zinc-850">
          <button
            onClick={() => updateProfileSetting('recognitionMode', 'continuous')}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              profile.recognitionMode !== 'push_to_talk'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Continuous
          </button>
          <button
            onClick={() => updateProfileSetting('recognitionMode', 'push_to_talk')}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              profile.recognitionMode === 'push_to_talk'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Push-to-Talk
          </button>
        </div>
        <p className="text-[11px] text-zinc-400">
          {profile.recognitionMode === 'push_to_talk'
            ? 'Press the microphone button whenever you speak a set.'
            : 'Listens hands-free in the background between sets with active noise gate.'}
        </p>
      </div>

      {/* Audio Feedback Toggles (TTS & Chime) */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Volume2 className="h-4 w-4 text-zinc-300" />
          <span>Audio Cues & Speech Feedback</span>
        </div>

        {/* Spoken Confirmations TTS */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-semibold text-white block">Spoken Confirmations (TTS)</span>
            <span className="text-[11px] text-zinc-400 block">Speaks back logged set (e.g. &quot;Bench press 185 for 8&quot;)</span>
          </div>
          <button
            onClick={() => {
              const next = !profile.spokenConfirmations;
              updateProfileSetting('spokenConfirmations', next);
              if (next) {
                speakVoiceConfirmation('Spoken confirmations enabled.');
              }
            }}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
              profile.spokenConfirmations !== false ? 'bg-white' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-black transition-transform ${
                profile.spokenConfirmations !== false ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Beep on Record Chime */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-850">
          <div>
            <span className="text-xs font-semibold text-white block">Beep on Voice Command</span>
            <span className="text-[11px] text-zinc-400 block">Acoustic chime when listening recognizes an utterance</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => playAcousticChime(true)}
              className="text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-800 px-2 py-1 rounded-md"
              title="Test chime"
            >
              Test
            </button>
            <button
              onClick={() => {
                const next = !profile.beepOnRecord;
                updateProfileSetting('beepOnRecord', next);
                if (next) playAcousticChime(true);
              }}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                profile.beepOnRecord !== false ? 'bg-white' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black transition-transform ${
                  profile.beepOnRecord !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Gym Noise Filter Preset */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Sliders className="h-4 w-4 text-zinc-300" />
          <span>Microphone DSP Noise Filter</span>
        </div>

        <div className="grid grid-cols-3 p-1 rounded-xl bg-black border border-zinc-850 text-center">
          {(['quiet', 'standard', 'aggressive'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => updateProfileSetting('microphoneSensitivity', mode)}
              className={`py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                (profile.microphoneSensitivity || 'aggressive') === mode
                  ? 'bg-zinc-800 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zinc-400">
          Aggressive preset enables real-time acoustic echo cancellation and background gym noise suppression.
        </p>
      </div>

      {/* Preferred Weight Unit & Default Rest Timer */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Scale className="h-4 w-4 text-zinc-300" />
          <span>Units & Rest Interval</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Weight Unit
            </label>
            <div className="grid grid-cols-2 p-1 rounded-xl bg-black border border-zinc-850">
              <button
                onClick={() => updateProfileSetting('preferredUnit', 'lbs')}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  profile.preferredUnit === 'lbs'
                    ? 'bg-zinc-800 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Pounds (lbs)
              </button>
              <button
                onClick={() => updateProfileSetting('preferredUnit', 'kg')}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  profile.preferredUnit === 'kg'
                    ? 'bg-zinc-800 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Kilos (kg)
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Default Rest
            </label>
            <select
              value={profile.defaultRestTimerSeconds || 90}
              onChange={(e) => updateProfileSetting('defaultRestTimerSeconds', parseInt(e.target.value) || 90)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
            >
              <option value="30">30 seconds</option>
              <option value="60">60 seconds</option>
              <option value="90">90 seconds</option>
              <option value="120">2 minutes</option>
              <option value="180">3 minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Athlete Anatomy & Gender (Controls Anatomical Heatmap) */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <User className="h-4 w-4 text-zinc-300" />
            <span>Athlete Anatomy & Silhouette</span>
          </div>
          <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-full uppercase border border-zinc-700">
            Heatmap
          </span>
        </div>

        <p className="text-xs text-zinc-400">
          Choose your silhouette to customize the Muscle Group Distribution heatmap on your Home dashboard.
        </p>

        <div className="grid grid-cols-3 p-1 rounded-xl bg-black border border-zinc-850">
          <button
            onClick={() => updateProfileSetting('gender', 'male')}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              (profile.gender || 'male') === 'male'
                ? 'bg-zinc-800 text-white shadow font-extrabold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Man
          </button>
          <button
            onClick={() => updateProfileSetting('gender', 'female')}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              profile.gender === 'female'
                ? 'bg-zinc-800 text-white shadow font-extrabold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Woman
          </button>
          <button
            onClick={() => updateProfileSetting('gender', 'other')}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              profile.gender === 'other'
                ? 'bg-zinc-800 text-white shadow font-extrabold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Neutral
          </button>
        </div>
      </div>

      {/* Supabase Connection Test */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Database className="h-4 w-4 text-zinc-300" />
            <span>Supabase Cloud Sync</span>
          </div>
          {isConfigured ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-750">
              <ShieldCheck className="h-3 w-3" /> Ready
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded-full">
              <ShieldAlert className="h-3 w-3" /> Offline Only
            </span>
          )}
        </div>

        <button
          onClick={handleTestConnection}
          disabled={testResult.status === 'testing' || !isConfigured}
          className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-bold text-white flex items-center justify-center gap-1.5 border border-zinc-750 transition cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${testResult.status === 'testing' ? 'animate-spin text-white' : ''}`} />
          <span>Test Database Connection</span>
        </button>

        {testResult.status !== 'idle' && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              testResult.status === 'success'
                ? 'bg-zinc-900 border border-zinc-700 text-zinc-100'
                : testResult.status === 'error'
                ? 'bg-rose-950/70 border border-rose-800 text-rose-300'
                : 'bg-zinc-950 border border-zinc-800 text-zinc-300'
            }`}
          >
            {testResult.status === 'success' ? (
              <Check className="h-4 w-4 text-zinc-200 shrink-0 mt-0.5" />
            ) : testResult.status === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <RefreshCw className="h-4 w-4 text-zinc-400 animate-spin shrink-0 mt-0.5" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* 4-Tab Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
