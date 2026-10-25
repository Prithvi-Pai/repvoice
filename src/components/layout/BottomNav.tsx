'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, History, Settings, Play } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface BottomNavProps {
  hasActiveWorkout?: boolean;
}

export function BottomNav({ hasActiveWorkout }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: hasActiveWorkout ? 'Active' : 'Workout',
      href: '/',
      icon: hasActiveWorkout ? Play : Dumbbell,
      active: pathname === '/',
      highlight: hasActiveWorkout,
    },
    {
      label: 'History',
      href: '/history',
      icon: History,
      active: pathname === '/history',
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      active: pathname === '/settings' || pathname === '/auth',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md pb-safe">
      <div className="flex h-16 max-w-md mx-auto items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full text-[11px] font-semibold transition-all duration-200',
                item.active
                  ? 'text-lime-400'
                  : 'text-zinc-400 hover:text-zinc-200',
                item.highlight && !item.active && 'text-lime-400/90 animate-pulse'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-xl mb-0.5 transition-all',
                  item.active && !item.highlight && 'bg-lime-400/10 text-lime-400 border border-lime-400/20',
                  item.highlight && item.active && 'bg-lime-400 text-black shadow-[0_0_15px_rgba(163,230,53,0.4)] scale-105'
                )}
              >
                <Icon className={cn('h-5 w-5', item.highlight && item.active ? 'text-black fill-black' : '')} />
              </div>
              <span className="tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
