'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dumbbell, ShieldCheck, User, LogOut, Settings, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdminDrawer } from './AdminDrawer';

export function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

  const userEmail = user?.email;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-black/95 backdrop-blur-md">
        <div className="flex h-14 max-w-md mx-auto items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white border border-zinc-700 group-hover:border-zinc-500 transition shadow-[0_0_12px_rgba(255,255,255,0.08)]">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base tracking-wider text-white flex items-center gap-1.5 uppercase">
                REP<span className="text-zinc-400">VOICE</span>
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {userEmail ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsAdminDrawerOpen(true)}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-200 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 transition cursor-pointer"
                  title="Open Admin Settings Menu"
                >
                  <ShieldCheck className="h-3 w-3 text-zinc-400" />
                  <span className="max-w-[85px] truncate">{userEmail.split('@')[0]}</span>
                  <Settings className="h-3 w-3 text-zinc-400 ml-0.5" />
                </button>

                {/* Hamburger / Top-Right Gear Icon Button */}
                <button
                  onClick={() => setIsAdminDrawerOpen(true)}
                  title="Open Settings & Admin Menu"
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition cursor-pointer"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/auth"
                  className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-zinc-200 border border-zinc-750 hover:border-zinc-500 hover:text-white transition"
                >
                  <User className="h-3 w-3 text-zinc-300" />
                  <span>Sign In</span>
                </Link>

                <button
                  onClick={() => setIsAdminDrawerOpen(true)}
                  title="Open Settings & Admin Menu"
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Admin Slide-Over Drawer */}
      <AdminDrawer
        isOpen={isAdminDrawerOpen}
        onClose={() => setIsAdminDrawerOpen(false)}
      />
    </>
  );
}
