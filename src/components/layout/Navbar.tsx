'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Dumbbell, ShieldCheck, User, LogOut } from 'lucide-react';
import { getSupabaseClient, getSupabaseConfig } from '@/lib/supabase/client';

export function Navbar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  useEffect(() => {
    const config = getSupabaseConfig();
    setIsConfigured(config.isConfigured);

    const client = getSupabaseClient();
    if (client) {
      client.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      });

      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        setUserEmail(session?.user?.email ?? null);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleSignOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
      setUserEmail(null);
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="flex h-14 max-w-md mx-auto items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/30 group-hover:border-lime-400/60 transition shadow-[0_0_12px_rgba(163,230,53,0.15)]">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              REP<span className="text-lime-400">VOICE</span>
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {userEmail ? (
            <div className="flex items-center gap-1.5">
              <Link
                href="/settings"
                className="flex items-center gap-1 rounded-full bg-lime-950/70 px-2.5 py-1 text-[11px] font-medium text-lime-400 border border-lime-800/60 hover:bg-lime-900/40 transition"
                title={`Logged in as ${userEmail}`}
              >
                <ShieldCheck className="h-3 w-3" />
                <span className="max-w-[100px] truncate">{userEmail.split('@')[0]}</span>
              </Link>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="flex items-center gap-1.5 rounded-full bg-zinc-850 px-2.5 py-1 text-[11px] font-bold text-zinc-200 border border-zinc-750 hover:border-lime-400 hover:text-lime-400 transition"
            >
              <User className="h-3 w-3 text-lime-400" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
