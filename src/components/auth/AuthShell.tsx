'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Dumbbell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/layout/Navbar';

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute = pathname === '/auth';

  // Protect routes and deep links
  useEffect(() => {
    if (!isLoading) {
      if (!user && !isAuthRoute) {
        // User not logged in, redirect to login screen
        router.replace('/auth');
      } else if (user && isAuthRoute) {
        // User is logged in, redirect to main application dashboard
        router.replace('/');
      }
    }
  }, [user, isLoading, isAuthRoute, router]);

  // 1. Loading Screen while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.08)]">
              <Dumbbell className="h-8 w-8 text-white animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-lg font-black tracking-widest uppercase text-white">
              REP<span className="text-zinc-500">VOICE</span>
            </h1>
            <p className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
              Verifying Session...
            </p>
          </div>
          <div className="w-24 h-1 bg-zinc-900 rounded-full overflow-hidden mt-1">
            <div className="w-full h-full bg-white/50 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Show ONLY the Login / Sign Up screen
  if (!user) {
    if (!isAuthRoute) {
      // Direct navigation/deep link intercepted: show brief redirecting screen
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Dumbbell className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Redirecting to Sign In...
            </p>
          </div>
        </div>
      );
    }

    // On /auth: Render ONLY the Login / Sign Up screen without any application navigation tabs
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col antialiased selection:bg-white selection:text-black">
        <main className="flex-1 max-w-md w-full mx-auto px-4 pt-6 pb-12">
          {children}
        </main>
      </div>
    );
  }

  // 3. Authenticated: Already logged in, but currently transitioning away from /auth
  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Dumbbell className="h-6 w-6 text-white" />
          </div>
          <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  // 4. Authenticated: Full Application with Navbar, Dashboard screens, and Navigation Tabs
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col antialiased selection:bg-white selection:text-black">
      <Navbar />
      <main className="flex-1 max-w-md w-full mx-auto pb-24 px-4 pt-3">
        {children}
      </main>
    </div>
  );
}
