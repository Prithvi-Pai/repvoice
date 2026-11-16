'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Calculator,
  Flame,
  Dumbbell,
  TrendingUp,
  Activity,
  Mic,
  Volume2,
  Brain,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';

export default function FormulasPage() {
  const formulas = [
    {
      category: 'STRENGTH & VOLUME',
      title: 'Set Volume & Total Session Volume',
      icon: Dumbbell,
      description:
        'Volume represents the mechanical workload performed. RepVoice automatically normalizes each set according to your selected unit (kg or lbs).',
      formula: 'Set Volume = Weight × Repetitions\nTotal Session Volume = Σ (Weight_i × Repetitions_i)',
      variables: [
        { name: 'Weight', detail: 'External resistance lifted in set' },
        { name: 'Repetitions', detail: 'Number of full completed repetitions' },
        { name: 'Unit Normalization', detail: '1 kg = 2.20462 lbs • 1 lb = 0.453592 kg' },
      ],
      example: '4 sets of 80 kg × 10 reps = 4 × (80 × 10) = 3,200 kg total volume.',
    },
    {
      category: 'STRENGTH & BENCHMARKS',
      title: 'Estimated 1-Repetition Maximum (1RM)',
      icon: TrendingUp,
      description:
        'Calculates your theoretical maximal strength on any exercise using the clinically validated Brzycki formula for sets under 10 reps.',
      formula: '1RM = Weight × [ 36 / ( 37 - Repetitions ) ]   (for Reps ≤ 10)\n1RM = Weight × [ 1 + ( Repetitions / 30 ) ]      (Epley fallback for Reps > 10)',
      variables: [
        { name: 'Weight', detail: 'Heaviest load completed with good form' },
        { name: 'Repetitions', detail: 'Rep count performed to near-failure' },
      ],
      example: '100 kg lifted for 6 reps: 1RM = 100 × (36 / 31) ≈ 116.1 kg theoretical 1RM.',
    },
    {
      category: 'PROGRESSION',
      title: 'Progressive Overload & Strength Delta (Δ %)',
      icon: Zap,
      description:
        'Measures the percentage increase in strength, 1RM, or volume between your initial baseline session and your current peak benchmark.',
      formula: 'Strength Delta (Δ %) = [ ( Peak Metric - Baseline Metric ) / Baseline Metric ] × 100',
      variables: [
        { name: 'Peak Metric', detail: 'All-time best weight, 1RM, or volume recorded' },
        { name: 'Baseline Metric', detail: 'Weight or volume from first recorded session' },
      ],
      example: 'Baseline Bench Press 60 kg to current peak 75 kg = [(75 - 60) / 60] × 100 = +25.0% strength gain.',
    },
    {
      category: 'PHYSIQUE & SYMMETRY',
      title: 'Muscle Group Volume Distribution (%)',
      icon: Activity,
      description:
        'Determines the proportion of total training volume dedicated to each anatomical muscle group over 30 days, 1 year, or all-time.',
      formula: 'Muscle Share (%) = [ Total Volume for Muscle Group / Total Workload Volume ] × 100',
      variables: [
        { name: 'Muscle Group Volume', detail: 'Sum of volume for exercises classified in that group' },
        { name: 'Total Workload Volume', detail: 'Sum of all volume across all movements in timeframe' },
      ],
      example: 'Chest volume 4,500 kg out of 18,000 kg total workout volume = (4,500 / 18,000) × 100 = 25% share.',
    },
    {
      category: 'PHYSIQUE & SYMMETRY',
      title: 'Neglected Muscle Alert Threshold',
      icon: Brain,
      description:
        'Flags lagging muscle groups that are under-stimulated, helping prevent postural imbalances and injury.',
      formula: 'Neglected Status = TRUE if ( Muscle Share < 8% ) OR ( Days Since Last Trained ≥ 10 )',
      variables: [
        { name: 'Muscle Share', detail: 'Percentage of total training volume in timeframe' },
        { name: 'Days Since Last Trained', detail: 'Calendar days elapsed since muscle was stimulated' },
      ],
      example: 'Calves or Hamstrings trained 12 days ago with only 4% volume share triggers an alert banner.',
    },
    {
      category: 'ENERGY & METABOLISM',
      title: 'Estimated Caloric Expenditure',
      icon: Flame,
      description:
        'Estimates metabolic energy burned during resistance training based on active workout duration, total volume density, and completed sets.',
      formula: 'Calories Burned ≈ ( Active Minutes ) × 6.5 × [ 1 + ( Completed Sets / 20 ) ]',
      variables: [
        { name: 'Active Minutes', detail: 'Cumulative elapsed session time in active workout' },
        { name: '6.5 MET Constant', detail: 'Metabolic Equivalent for moderate-to-high intensity lifting' },
        { name: 'Set Density Multiplier', detail: 'Scales energy cost with higher volume density' },
      ],
      example: '45-minute workout with 15 sets: 45 × 6.5 × (1 + 0.75) ≈ 512 kcal burned.',
    },
    {
      category: 'CONSISTENCY',
      title: 'Active Workout Streak (Days)',
      icon: Flame,
      description:
        'Calculates consecutive calendar days with at least one completed workout session, allowing a 24-hour grace window.',
      formula: 'Streak Days = Contiguous count of days {D_0, D_-1, D_-2...} with ≥ 1 completed workout',
      variables: [
        { name: 'Local Date Key', detail: 'Calendar day normalized to your device timezone (YYYY-MM-DD)' },
        { name: 'Grace Window', detail: 'Streak remains active if a workout was completed today or yesterday' },
      ],
      example: 'Workouts logged on Monday, Tuesday, and Wednesday = 3-Day active streak.',
    },
    {
      category: 'SPEECH & TELEMETRY',
      title: 'Voice Sync & Hands-Free Accuracy Rate',
      icon: Mic,
      description:
        'Quantifies the proportion of sets logged completely hands-free via speech recognition without manual touchscreen typing.',
      formula: 'Voice Sync (%) = [ Hands-Free Voice Logged Sets / Total Completed Sets ] × 100',
      variables: [
        { name: 'Voice Logged Sets', detail: 'Sets identified and entered through voice parsing' },
        { name: 'Total Sets', detail: 'All completed sets in the workout session' },
      ],
      example: '12 out of 12 sets logged hands-free = 100% voice sync efficiency.',
    },
    {
      category: 'AUDIO & DSP',
      title: 'Ambient Gym Noise Level (dB SPL)',
      icon: Volume2,
      description:
        'Computes real-time acoustic loudness in decibels from microphone Root-Mean-Square (RMS) amplitude.',
      formula: 'RMS = √ [ ( 1 / N ) × Σ x[i]² ]\ndB SPL ≈ 20 × log₁₀( RMS ) + Calibration Offset (100 dB)',
      variables: [
        { name: 'x[i]', detail: 'Raw time-domain microphone audio waveform sample' },
        { name: 'N', detail: 'FFT audio analyzer window size (typically 2048 samples)' },
        { name: 'Classification', detail: 'Low (<55 dB), Moderate (55-70 dB), High (70-82 dB), Very High (>82 dB)' },
      ],
      example: 'Quiet room ≈ 42 dB; Typical gym with music and clanking weights ≈ 74 dB (High).',
    },
    {
      category: 'AUDIO & DSP',
      title: 'Signal-to-Noise Ratio (SNR) & Voice Clarity',
      icon: Volume2,
      description:
        'Measures speech power relative to ambient background noise to grade voice capture quality during the Voice Clarity Test.',
      formula: 'SNR (dB) = 10 × log₁₀ ( Speech Signal Power / Background Noise Power )',
      variables: [
        { name: 'Speech Power', detail: 'Average audio power while athlete is vocalizing test phrase' },
        { name: 'Noise Power', detail: 'Ambient sound floor captured during silence intervals' },
        { name: 'Ratings', detail: 'Excellent (≥15 dB), Good (10-14 dB), Fair (5-9 dB), Poor (<5 dB)' },
      ],
      example: 'Speech at 78 dB with gym background noise at 62 dB = +16 dB SNR → "Excellent" clarity.',
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="space-y-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Settings</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Calculation Engine
            </span>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">
              Formulas & Metrics
            </h1>
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          RepVoice uses validated biomechanical equations, physiological models, and digital signal processing algorithms to compute training telemetry in real time.
        </p>
      </div>

      {/* Formula Cards Grid */}
      <div className="space-y-4">
        {formulas.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-3xl bg-zinc-950 border border-zinc-850 space-y-3.5 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">
                      {item.category}
                    </span>
                    <h3 className="text-sm font-extrabold text-white">
                      {item.title}
                    </h3>
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                {item.description}
              </p>

              {/* Mathematical Formula Box */}
              <div className="p-3 rounded-2xl bg-black border border-zinc-800 font-mono text-xs text-white overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                {item.formula}
              </div>

              {/* Variables Breakdown */}
              <div className="space-y-1.5 pt-1 border-t border-zinc-900">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                  Variables & Standards
                </span>
                <div className="space-y-1">
                  {item.variables.map((v, vIdx) => (
                    <div key={vIdx} className="text-xs flex items-baseline gap-1.5">
                      <span className="font-bold text-zinc-300 font-mono text-[11px] shrink-0">
                        {v.name}:
                      </span>
                      <span className="text-zinc-400 text-[11px]">{v.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practical Calculation Example */}
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-300">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
                  Example
                </span>
                <p className="text-[11px] text-zinc-300">{item.example}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Persistent Bottom Nav */}
      <BottomNav />
    </div>
  );
}
