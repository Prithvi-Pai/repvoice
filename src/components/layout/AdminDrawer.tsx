'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  Settings,
  User,
  Sliders,
  Scale,
  Download,
  CreditCard,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Volume2,
  Check,
  ChevronRight,
  ExternalLink,
  Crown,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserProfile, WeightUnit, Gender } from '@/types';
import { getStoredProfile, saveStoredProfile, getWorkoutHistory, syncUserProfileFromCloud } from '@/lib/storage';
import { downloadWorkoutsCSV, downloadWorkoutsJSON } from '@/lib/export/csvExport';
import { playAcousticChime, speakVoiceConfirmation } from '@/lib/voice/audioFeedback';

interface AdminDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminDrawer({ isOpen, onClose }: AdminDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    id: 'guest',
    displayName: 'Gym Athlete',
    preferredUnit: 'kg',
    recognitionMode: 'continuous',
    spokenConfirmations: true,
    beepOnRecord: true,
    microphoneSensitivity: 'aggressive',
    defaultRestTimerSeconds: 90,
    gender: 'male',
  });

  const [activeSection, setActiveSection] = useState<'all' | 'account' | 'voice' | 'units' | 'export' | 'subscription'>('all');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProfile(getStoredProfile());
      if (user) {
        syncUserProfileFromCloud(user).then((p) => setProfile(p));
      }

      const handleProfileUpdate = (e: any) => {
        if (e.detail) setProfile(e.detail);
        else setProfile(getStoredProfile());
      };
      window.addEventListener('repvoice_profile_updated', handleProfileUpdate as EventListener);
      return () => {
        window.removeEventListener('repvoice_profile_updated', handleProfileUpdate as EventListener);
      };
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    saveStoredProfile(updated);
    setSyncNotice(user ? 'Synced' : 'Saved');
    setTimeout(() => setSyncNotice(null), 2000);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
    router.replace('/auth');
  };

  const handleExportCSV = async () => {
    const history = await getWorkoutHistory();
    const result = downloadWorkoutsCSV(history.workouts || []);
    if (result.success) {
      setExportNotice(`Exported ${result.count} workouts to ${result.filename}`);
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  const handleExportJSON = async () => {
    const history = await getWorkoutHistory();
    const result = downloadWorkoutsJSON(history.workouts || []);
    if (result.success) {
      setExportNotice(`Exported JSON data (${result.count} workouts)`);
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm transition-all animate-fadeIn">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-sm h-full bg-zinc-950 border-l border-zinc-850 flex flex-col shadow-2xl z-10 overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-850 bg-black/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Admin Panel
              </span>
              <h2 className="text-sm font-black text-white tracking-tight uppercase">
                Settings & Preferences
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
            title="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {exportNotice && (
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-white shrink-0" />
              <span>{exportNotice}</span>
            </div>
          )}

          {/* Section 1: Account Settings */}
          <div className="p-3.5 rounded-2xl bg-black border border-zinc-850 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-zinc-300" />
                <span className="text-xs font-bold text-white">Account Settings</span>
              </div>
              {user ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="h-3 w-3 text-zinc-300" /> Active
                </span>
              ) : (
                <span className="text-[10px] text-zinc-500">Guest</span>
              )}
            </div>

            {user ? (
              <div className="space-y-2">
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-850">
                  <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Signed in as</span>
                  <span className="text-xs font-bold text-white block truncate">{user.email}</span>
                </div>

                <button
                  onClick={handleSignOut}
                  className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-800 border border-zinc-800 text-xs font-bold text-zinc-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-extrabold flex items-center justify-center transition"
              >
                Sign In / Register
              </Link>
            )}
          </div>

          {/* Section 2: Voice Sensitivity Calibration */}
          <div className="p-3.5 rounded-2xl bg-black border border-zinc-850 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-zinc-300" />
                <span className="text-xs font-bold text-white">Voice Sensitivity Calibration</span>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                DSP Noise Gate
              </span>
            </div>

            {/* Listening Mode */}
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                Listening Mode
              </label>
              <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-850">
                <button
                  onClick={() => updateSetting('recognitionMode', 'continuous')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${
                    profile.recognitionMode !== 'push_to_talk'
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Continuous
                </button>
                <button
                  onClick={() => updateSetting('recognitionMode', 'push_to_talk')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${
                    profile.recognitionMode === 'push_to_talk'
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Push-to-Talk
                </button>
              </div>
            </div>

            {/* Noise Filter Sensitivity Preset */}
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                Microphone Noise Gate
              </label>
              <div className="grid grid-cols-3 p-1 rounded-xl bg-zinc-950 border border-zinc-850 text-center">
                {(['quiet', 'standard', 'aggressive'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateSetting('microphoneSensitivity', mode)}
                    className={`py-1 rounded-lg text-xs font-bold capitalize transition ${
                      (profile.microphoneSensitivity || 'aggressive') === mode
                        ? 'bg-zinc-800 text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Feedback TTS */}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
              <span className="text-xs text-zinc-300">Spoken Confirmations (TTS)</span>
              <button
                onClick={() => {
                  const next = !profile.spokenConfirmations;
                  updateSetting('spokenConfirmations', next);
                  if (next) speakVoiceConfirmation('Voice confirmations active.');
                }}
                className={`w-10 h-5 rounded-full transition-colors p-0.5 ${
                  profile.spokenConfirmations !== false ? 'bg-white' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black transition-transform ${
                    profile.spokenConfirmations !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 3: Units (kg/lbs) & Rest Interval */}
          <div className="p-3.5 rounded-2xl bg-black border border-zinc-850 space-y-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-zinc-300" />
              <span className="text-xs font-bold text-white">Units & Rest Timer</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                  Weight Unit
                </label>
                <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-850">
                  <button
                    onClick={() => updateSetting('preferredUnit', 'lbs')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition ${
                      profile.preferredUnit === 'lbs' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    lbs
                  </button>
                  <button
                    onClick={() => updateSetting('preferredUnit', 'kg')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition ${
                      profile.preferredUnit === 'kg' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    kg
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                  Default Rest
                </label>
                <select
                  value={profile.defaultRestTimerSeconds || 90}
                  onChange={(e) => updateSetting('defaultRestTimerSeconds', parseInt(e.target.value) || 90)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="30">30s</option>
                  <option value="60">60s</option>
                  <option value="90">90s</option>
                  <option value="120">2m</option>
                  <option value="180">3m</option>
                </select>
              </div>
            </div>

            {/* Silhouette / Gender Selection */}
            <div className="pt-2 border-t border-zinc-900">
              <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                Anatomy Heatmap Silhouette
              </label>
              <div className="grid grid-cols-3 p-1 rounded-xl bg-zinc-950 border border-zinc-850 text-center">
                {(['male', 'female', 'other'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => updateSetting('gender', g)}
                    className={`py-1 rounded-lg text-xs font-bold capitalize transition ${
                      (profile.gender || 'male') === g ? 'bg-zinc-800 text-white shadow font-extrabold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {g === 'male' ? 'Man' : g === 'female' ? 'Woman' : 'Neutral'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: CSV Data Export */}
          <div className="p-3.5 rounded-2xl bg-black border border-zinc-850 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-zinc-300" />
                <span className="text-xs font-bold text-white">CSV Data Export</span>
              </div>
              <span className="text-[10px] text-zinc-400">Offline Backup</span>
            </div>

            <p className="text-[11px] text-zinc-400">
              Export all your logged workouts, sets, weights, repetitions, and muscle classifications to standard CSV or JSON.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportCSV}
                className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold border border-zinc-800 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-zinc-300" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold border border-zinc-800 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <FileCode className="h-3.5 w-3.5 text-zinc-400" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Section 5: Subscription Management */}
          <div className="p-3.5 rounded-2xl bg-black border border-zinc-850 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-white" />
                <span className="text-xs font-bold text-white">Subscription Management</span>
              </div>
              <span className="text-[10px] font-black text-black bg-white px-2 py-0.5 rounded-full uppercase">
                Pro Active
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2 text-zinc-300">
                <Check className="h-3 w-3 text-white shrink-0" />
                <span>Unlimited Hands-Free Voice Logging</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <Check className="h-3 w-3 text-white shrink-0" />
                <span>Gym Audio Intelligence DSP & Waveforms</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <Check className="h-3 w-3 text-white shrink-0" />
                <span>Continuous Muscle Learning & Disambiguation</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <Check className="h-3 w-3 text-white shrink-0" />
                <span>Anatomical Silhouette Heatmap & Overload Charts</span>
              </div>
            </div>

            <button
              onClick={() => {
                setExportNotice('RepVoice Athlete Pro is active for your account.');
                setTimeout(() => setExportNotice(null), 3000);
              }}
              className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition cursor-pointer flex items-center justify-center gap-1"
            >
              <CreditCard className="h-3.5 w-3.5 text-zinc-400" />
              <span>Manage Billing & Tier</span>
            </button>
          </div>

          {/* Section 6: Formulas & Calculations Reference */}
          <div className="p-3.5 rounded-2xl bg-black border border-zinc-850 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-zinc-300" />
                <span className="text-xs font-bold text-white">Formulas & Metrics</span>
              </div>
              <span className="text-[10px] text-zinc-400">11 Models</span>
            </div>

            <p className="text-[11px] text-zinc-400">
              Review mathematical equations for Volume, 1RM Brzycki, Overload Δ%, Calorie burn, Noise dB, and Voice SNR.
            </p>

            <Link
              href="/settings/formulas"
              onClick={onClose}
              className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-white flex items-center justify-between transition group cursor-pointer"
            >
              <span>Explore Metric Formulas</span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-white transition" />
            </Link>
          </div>
        </div>

        {/* Drawer Footer Link to Full Settings */}
        <div className="p-3 border-t border-zinc-850 bg-black/80">
          <Link
            href="/settings"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition"
          >
            <span>Open Full Settings Page</span>
            <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
