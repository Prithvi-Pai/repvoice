'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Mail,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Dumbbell
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { BottomNav } from '@/components/layout/BottomNav';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (client) {
      client.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setCurrentEmail(data.user.email);
        }
      });
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const client = getSupabaseClient();
    if (!client) {
      setErrorMessage('Authentication service is currently unavailable. Please try again.');
      return;
    }

    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setSuccessMessage(
            'Account created! A confirmation email has been sent. Please confirm before signing in.'
          );
        } else {
          setSuccessMessage('Account created and signed in successfully!');
          setTimeout(() => {
            router.push('/');
          }, 1000);
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMessage('Signed in successfully! Redirecting...');
          setTimeout(() => {
            router.push('/');
          }, 800);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
      setCurrentEmail(null);
      setSuccessMessage('Signed out successfully.');
    }
  };

  return (
    <div className="space-y-6 pb-12 pt-2">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-lime-400/10 border border-lime-400/30 text-lime-400 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.2)]">
          <Dumbbell className="h-7 w-7 text-lime-400" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Athlete Account</h1>
        <p className="text-xs text-zinc-400 max-w-xs mx-auto">
          Sign in to automatically sync your workouts, sets, and volume across all devices.
        </p>
      </div>

      {/* Already Logged In Card */}
      {currentEmail && (
        <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-lime-400/10 text-lime-400 flex items-center justify-center font-bold">
              {currentEmail.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-lime-400 block">
                Currently Signed In
              </span>
              <p className="font-bold text-sm text-white">{currentEmail}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/"
              className="flex-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-[0_0_15px_rgba(163,230,53,0.25)]"
            >
              <span>Back to Workout</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 font-bold text-xs border border-zinc-700 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Auth Form Card */}
      {!currentEmail && (
        <div className="p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
            <button
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mode === 'signin'
                  ? 'bg-zinc-800 text-lime-400 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mode === 'signup'
                  ? 'bg-zinc-800 text-lime-400 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Sign Up</span>
            </button>
          </div>

          {/* Feedback banners */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-lime-950/60 border border-lime-800/80 text-lime-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-lime-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@gym.com"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-lime-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-lime-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(163,230,53,0.3)] active:scale-95 transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>{mode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
                </>
              ) : (
                <span>{mode === 'signup' ? 'Create Free Account' : 'Sign In to RepVoice'}</span>
              )}
            </button>
          </form>

          <p className="text-[11px] text-zinc-500 text-center">
            {mode === 'signup'
              ? 'By creating an account, your workouts are secured with Row Level Security in Supabase PostgreSQL.'
              : 'Workouts are privately isolated so only you can access your own logs.'}
          </p>
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
