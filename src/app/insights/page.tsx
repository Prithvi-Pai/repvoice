'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Activity,
  Flame,
  Brain,
  Dumbbell,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { Workout, Gender, WeightUnit } from '@/types';
import { getWorkoutHistory, getStoredProfile, getActiveWorkout } from '@/lib/storage';
import { ProgressiveOverloadSection } from '@/components/home/ProgressiveOverloadSection';
import { MuscleDistributionSection } from '@/components/home/MuscleDistributionSection';
import { ContinuousLearningSection } from '@/components/insights/ContinuousLearningSection';
import { AcousticIntelligenceSection } from '@/components/insights/AcousticIntelligenceSection';
import { BottomNav } from '@/components/layout/BottomNav';
import { calculateSetVolume } from '@/lib/utils/unitConversion';

export default function InsightsPage() {
  const [workoutHistory, setWorkoutHistory] = useState<Workout[]>([]);
  const [userGender, setUserGender] = useState<Gender>('male');
  const [preferredUnit, setPreferredUnit] = useState<WeightUnit>('kg');
  const [activeTab, setActiveTab] = useState<'all' | 'overload' | 'heatmap' | 'learning' | 'acoustic'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const profile = getStoredProfile();
    if (profile.gender) setUserGender(profile.gender);
    if (profile.preferredUnit) setPreferredUnit(profile.preferredUnit);

    getWorkoutHistory().then((res) => {
      setWorkoutHistory(res.workouts || []);
      setIsLoading(false);
    });

    const handleSync = () => {
      const p = getStoredProfile();
      if (p.gender) setUserGender(p.gender);
      if (p.preferredUnit) setPreferredUnit(p.preferredUnit);
    };

    window.addEventListener('focus', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const hasActive = Boolean(getActiveWorkout());

  // Aggregate stats across history
  const totalVolume = workoutHistory.reduce((acc, w) => {
    return (
      acc +
      w.exercises.reduce((exAcc, ex) => {
        return (
          exAcc +
          ex.sets.reduce((sAcc, s) => {
            return sAcc + (s.isCompleted !== false ? calculateSetVolume(s.weight, s.reps, s.unit, preferredUnit) : 0);
          }, 0)
        );
      }, 0)
    );
  }, 0);

  const formattedTotalVolume =
    totalVolume >= 1000000
      ? `${(totalVolume / 1000000).toFixed(1)}M`
      : totalVolume >= 1000
      ? `${(totalVolume / 1000).toFixed(1)}k`
      : totalVolume.toLocaleString();

  return (
    <div className="space-y-5 pb-16">
      {/* Page Title & Intelligence Summary Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Intelligence & Analytics
              </span>
              <h1 className="text-lg font-black tracking-tight text-white uppercase">
                Training Insights
              </h1>
            </div>
          </div>

          <span className="text-[11px] font-bold text-zinc-200 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-white" />
            <span>{workoutHistory.length} Sessions</span>
          </span>
        </div>
      </div>

      {/* Quick Stat Pill Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-850 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase">Total Volume</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-black text-white tabular-nums tracking-tight">
              {formattedTotalVolume}
            </span>
            <span className="text-[10px] text-zinc-400 font-bold">{preferredUnit}</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-850 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase">Movements</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-black text-white tabular-nums tracking-tight">
              {new Set(workoutHistory.flatMap((w) => w.exercises.map((e) => e.exerciseName.toLowerCase()))).size}
            </span>
            <span className="text-[10px] text-zinc-400 font-bold">Tracked</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-850 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase">Anatomy</span>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-xs font-black text-white capitalize">{userGender}</span>
            <span className="text-[10px] text-zinc-500">• Vector</span>
          </div>
        </div>
      </div>

      {/* Sub-Section Filter Chips */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-zinc-950 border border-zinc-850 overflow-x-auto scrollbar-none text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'all' ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          All Insights
        </button>
        <button
          onClick={() => setActiveTab('overload')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'overload' ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Progressive Overload
        </button>
        <button
          onClick={() => setActiveTab('heatmap')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'heatmap' ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Anatomical Heatmap
        </button>
        <button
          onClick={() => setActiveTab('learning')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'learning' ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Disambiguation & Learning
        </button>
        <button
          onClick={() => setActiveTab('acoustic')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'acoustic' ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Acoustic Intelligence
        </button>
      </div>

      {/* Section 1: Progressive Overload & Benchmarks */}
      {(activeTab === 'all' || activeTab === 'overload') && (
        <div className="space-y-2">
          <ProgressiveOverloadSection
            workoutHistory={workoutHistory}
            preferredUnit={preferredUnit}
          />
        </div>
      )}

      {/* Section 2: Muscle Distribution & Anatomical Silhouette Heatmap */}
      {(activeTab === 'all' || activeTab === 'heatmap') && (
        <div className="space-y-2">
          <MuscleDistributionSection
            workoutHistory={workoutHistory}
            gender={userGender}
            preferredUnit={preferredUnit}
          />
        </div>
      )}

      {/* Section 3: Muscle Group Disambiguation & Continuous Learning */}
      {(activeTab === 'all' || activeTab === 'learning') && (
        <div className="space-y-2">
          <ContinuousLearningSection />
        </div>
      )}

      {/* Section 4: Acoustic Intelligence & Accuracy Trend */}
      {(activeTab === 'all' || activeTab === 'acoustic') && (
        <div className="space-y-2">
          <AcousticIntelligenceSection
            workoutHistory={workoutHistory}
            preferredUnit={preferredUnit}
          />
        </div>
      )}

      {/* Persistent Bottom Nav (4 Tabs: Workout, Plans, History, Insights) */}
      <BottomNav hasActiveWorkout={hasActive} />
    </div>
  );
}
