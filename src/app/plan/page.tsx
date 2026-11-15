'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarRange,
  Plus,
  Play,
  Edit3,
  Trash2,
  Dumbbell,
  Clock,
  Flame,
  X,
  Check,
  Calendar,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { WorkoutPlan, PlanExercise } from '@/types';
import {
  getWorkoutPlans,
  saveWorkoutPlan,
  deleteWorkoutPlan,
  instantiateWorkoutFromPlan,
  DEFAULT_PLANS,
} from '@/lib/plans/planStore';
import { saveActiveWorkout } from '@/lib/storage';
import { BottomNav } from '@/components/layout/BottomNav';

function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return 'Anytime';
  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];

  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().split('T')[0];

  if (dateStr === todayKey) {
    return `Today, ${today.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }
  if (dateStr === tomorrowKey) {
    return `Tomorrow, ${tomorrow.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return dateStr;
}

export default function PlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);

  // Today's date reference
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Selected date filter (default 'all', or specific YYYY-MM-DD including today)
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');

  // Form State for Plan Modal
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formScheduledDate, setFormScheduledDate] = useState<string>(todayStr);
  const [formExercises, setFormExercises] = useState<
    Array<{
      id: string;
      exerciseName: string;
      targetSets: number;
      targetReps: number;
      targetWeight: number;
      unit: 'lbs' | 'kg';
      restSeconds: number;
    }>
  >([]);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const res = await getWorkoutPlans();
      // Ensure existing default plans have scheduledDate normalized if missing
      const enriched = res.plans.map((p, idx) => {
        if (!p.scheduledDate) {
          if (idx === 0) return { ...p, scheduledDate: todayStr, scheduledDay: `Today, ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` };
          if (idx === 1) return { ...p, scheduledDate: tomorrowStr, scheduledDay: `Tomorrow, ${new Date(Date.now() + 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` };
        }
        return p;
      });
      setPlans(enriched);
    } catch (e) {
      console.warn('Failed to load plans:', e);
      setPlans(DEFAULT_PLANS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWorkout = (plan: WorkoutPlan) => {
    const liveWorkout = instantiateWorkoutFromPlan(plan);
    saveActiveWorkout(liveWorkout);
    router.push('/');
  };

  const handleOpenCreateModal = (planToEdit?: WorkoutPlan) => {
    if (planToEdit) {
      setEditingPlan(planToEdit);
      setFormTitle(planToEdit.title);
      setFormDescription(planToEdit.description || '');
      setFormScheduledDate(planToEdit.scheduledDate || todayStr);
      setFormExercises(
        planToEdit.exercises.map((pe) => ({
          id: pe.id,
          exerciseName: pe.exerciseName,
          targetSets: pe.targetSets || 3,
          targetReps: pe.targetReps || 10,
          targetWeight: pe.targetWeight || 0,
          unit: pe.unit || 'lbs',
          restSeconds: pe.restSeconds || 90,
        }))
      );
    } else {
      setEditingPlan(null);
      setFormTitle('');
      setFormDescription('');
      setFormScheduledDate(selectedDateFilter !== 'all' ? selectedDateFilter : todayStr);
      setFormExercises([
        {
          id: `pe_${Date.now()}_1`,
          exerciseName: 'Incline Dumbbell Press',
          targetSets: 4,
          targetReps: 10,
          targetWeight: 65,
          unit: 'lbs',
          restSeconds: 90,
        },
        {
          id: `pe_${Date.now()}_2`,
          exerciseName: 'Lat Pulldown',
          targetSets: 4,
          targetReps: 10,
          targetWeight: 140,
          unit: 'lbs',
          restSeconds: 75,
        },
      ]);
    }
    setIsModalOpen(true);
  };

  const handleAddExerciseRow = () => {
    setFormExercises((prev) => [
      ...prev,
      {
        id: `pe_${Date.now()}_${prev.length + 1}`,
        exerciseName: '',
        targetSets: 3,
        targetReps: 10,
        targetWeight: 0,
        unit: 'lbs',
        restSeconds: 90,
      },
    ]);
  };

  const handleRemoveExerciseRow = (index: number) => {
    setFormExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePlan = async () => {
    if (!formTitle.trim()) {
      alert('Please enter a routine title');
      return;
    }

    const cleanedExercises: PlanExercise[] = formExercises
      .filter((e) => e.exerciseName.trim().length > 0)
      .map((e, idx) => ({
        id: e.id,
        exerciseName: e.exerciseName.trim(),
        targetSets: Number(e.targetSets) || 3,
        targetReps: Number(e.targetReps) || 10,
        targetWeight: Number(e.targetWeight) || 0,
        unit: e.unit,
        restSeconds: Number(e.restSeconds) || 90,
        orderIndex: idx,
      }));

    if (cleanedExercises.length === 0) {
      alert('Please add at least one exercise');
      return;
    }

    const friendlyDay = formatFriendlyDate(formScheduledDate);

    const planToSave: WorkoutPlan = {
      id: editingPlan ? editingPlan.id : `plan_${Date.now()}`,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      scheduledDay: friendlyDay,
      scheduledDate: formScheduledDate,
      isActive: true,
      orderIndex: editingPlan ? editingPlan.orderIndex : plans.length,
      exercises: cleanedExercises,
    };

    await saveWorkoutPlan(planToSave);
    setIsModalOpen(false);
    await loadPlans();
  };

  const handleDelete = async (planId: string, title: string) => {
    if (!confirm(`Delete routine "${title}"?`)) return;
    await deleteWorkoutPlan(planId);
    setPlans((prev) => prev.filter((p) => p.id !== planId));
  };

  // Filter plans based on selected date
  const filteredPlans = useMemo(() => {
    if (selectedDateFilter === 'all') return plans;
    return plans.filter((p) => p.scheduledDate === selectedDateFilter);
  }, [plans, selectedDateFilter]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-28 pt-4 px-4 font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Header matching Stitch Obsidian */}
      <header className="max-w-md mx-auto mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-inner">
              <CalendarRange className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Custom Routine Builder
              </span>
              <h1 className="text-xl font-black text-white tracking-tight">Plan Workouts</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
            <span>100% Free Split</span>
          </div>
        </div>

        <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
          Build plans with total freedom. No rigid splits or forced templates — you decide every exercise, rep target, and rest interval.
        </p>

        {/* CTA: + Plan Your Workout (Solid Black/White Theme) */}
        <button
          onClick={() => handleOpenCreateModal()}
          className="w-full mt-4 min-h-[50px] bg-white hover:bg-zinc-200 text-black rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(255,255,255,0.15)] transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-5 h-5 text-black stroke-[3]" />
          <span>+ Plan Your Workout</span>
        </button>
      </header>

      {/* Date Option Filter Bar: Pick Any Day Workout (including Current Date) */}
      <section className="max-w-md mx-auto mb-5">
        <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-300" />
              <span>Select Workout Day</span>
            </span>
            {selectedDateFilter !== 'all' && (
              <button
                onClick={() => setSelectedDateFilter('all')}
                className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
              >
                Show All ({plans.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {/* All chip */}
            <button
              onClick={() => setSelectedDateFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                selectedDateFilter === 'all'
                  ? 'bg-zinc-200 text-black shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              All Plans
            </button>

            {/* Today chip (Current Date) */}
            <button
              onClick={() => setSelectedDateFilter(todayStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 flex items-center gap-1 ${
                selectedDateFilter === todayStr
                  ? 'bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                  : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>Today ({new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})</span>
            </button>

            {/* Tomorrow chip */}
            <button
              onClick={() => setSelectedDateFilter(tomorrowStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                selectedDateFilter === tomorrowStr
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Tomorrow
            </button>

            {/* Custom Date Picker Input */}
            <div className="relative flex-shrink-0">
              <input
                type="date"
                value={selectedDateFilter !== 'all' && selectedDateFilter !== todayStr && selectedDateFilter !== tomorrowStr ? selectedDateFilter : ''}
                onChange={(e) => {
                  if (e.target.value) setSelectedDateFilter(e.target.value);
                }}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                title="Pick custom date"
              />
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  selectedDateFilter !== 'all' && selectedDateFilter !== todayStr && selectedDateFilter !== tomorrowStr
                    ? 'bg-white text-black border-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {selectedDateFilter !== 'all' && selectedDateFilter !== todayStr && selectedDateFilter !== tomorrowStr
                    ? formatFriendlyDate(selectedDateFilter)
                    : 'Pick Date'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Routine Cards List */}
      <main className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-200">
              {selectedDateFilter === 'all'
                ? 'Upcoming Routines'
                : `Routines for ${formatFriendlyDate(selectedDateFilter)}`}
            </h2>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              {filteredPlans.length} Scheduled
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-zinc-500 text-xs animate-pulse">
            Loading workout routines...
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <Dumbbell className="w-10 h-10 text-zinc-700 mx-auto" />
            <h3 className="text-sm font-bold text-white">
              {selectedDateFilter === 'all'
                ? 'No workouts planned yet'
                : `No workout scheduled for ${formatFriendlyDate(selectedDateFilter)}`}
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Plan what you want to train for this day or choose another routine.
            </p>
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Routine for {selectedDateFilter === 'all' ? 'Today' : formatFriendlyDate(selectedDateFilter)}</span>
            </button>
          </div>
        ) : (
          filteredPlans.map((plan) => {
            const totalSets = plan.exercises.reduce((sum, e) => sum + (e.targetSets || 0), 0);
            const isToday = plan.scheduledDate === todayStr || plan.scheduledDay?.toLowerCase().includes('today');

            return (
              <div
                key={plan.id}
                className={`rounded-2xl bg-zinc-950 border p-4 shadow-lg transition-all ${
                  isToday
                    ? 'border-zinc-600 shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Plan Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isToday
                            ? 'bg-white text-black shadow-sm'
                            : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {plan.scheduledDay || (plan.scheduledDate ? formatFriendlyDate(plan.scheduledDate) : 'Anytime')}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
                          • TODAY&apos;S WORKOUT
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-white tracking-tight leading-snug">
                      {plan.title}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-xl flex items-center gap-1 flex-shrink-0">
                    <Dumbbell className="w-3 h-3 text-zinc-300" />
                    {totalSets} sets
                  </span>
                </div>

                {/* Exercises list preview */}
                <div className="bg-zinc-900/80 rounded-xl p-3 my-3 border border-zinc-800/80">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1.5">
                    {plan.exercises.length} Exercises Planned:
                  </span>
                  <div className="space-y-1.5">
                    {plan.exercises.map((ex, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-zinc-300 flex items-center justify-between"
                      >
                        <span className="truncate pr-2 font-medium text-zinc-200">
                          • {ex.exerciseName}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono flex-shrink-0">
                          {ex.targetSets} × {ex.targetReps}
                          {ex.targetWeight ? ` @ ${ex.targetWeight} ${ex.unit}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions: Start Workout, Edit, Delete (Solid Monochrome Theme) */}
                <div className="grid grid-cols-12 gap-2 pt-1">
                  <button
                    onClick={() => handleStartWorkout(plan)}
                    className="col-span-8 min-h-[44px] bg-white hover:bg-zinc-200 text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Start Workout</span>
                  </button>
                  <button
                    onClick={() => handleOpenCreateModal(plan)}
                    className="col-span-2 min-h-[44px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer"
                    title="Edit Plan"
                  >
                    <Edit3 className="w-4 h-4 text-zinc-300" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id, plan.title)}
                    className="col-span-2 min-h-[44px] bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-800 text-zinc-400 hover:text-red-400 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Create / Edit Plan Modal with Date Option */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-white" />
                <span>{editingPlan ? 'Edit Workout Plan' : 'Create Custom Routine'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 py-4 pr-1">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Routine Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Push Day Hypertrophy"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 placeholder-zinc-600"
                />
              </div>

              {/* Date Option: Select any day including current date */}
              <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Workout Date (Any Day)</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-semibold">
                    {formatFriendlyDate(formScheduledDate)}
                  </span>
                </div>

                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => setFormScheduledDate(todayStr)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      formScheduledDate === todayStr
                        ? 'bg-white text-black'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormScheduledDate(tomorrowStr)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      formScheduledDate === tomorrowStr
                        ? 'bg-white text-black'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <input
                    type="date"
                    value={formScheduledDate}
                    onChange={(e) => {
                      if (e.target.value) setFormScheduledDate(e.target.value);
                    }}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Short Description (Optional)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Chest & Triceps focus"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 placeholder-zinc-600"
                />
              </div>

              {/* Exercises List Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Planned Exercises ({formExercises.length})
                  </label>
                  <button
                    onClick={handleAddExerciseRow}
                    className="text-xs font-bold text-white flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Exercise
                  </button>
                </div>

                <div className="space-y-3">
                  {formExercises.map((ex, idx) => (
                    <div
                      key={ex.id || idx}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 relative"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-zinc-400">
                          #{idx + 1} Movement
                        </span>
                        {formExercises.length > 1 && (
                          <button
                            onClick={() => handleRemoveExerciseRow(idx)}
                            className="text-zinc-500 hover:text-red-400 text-xs p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={ex.exerciseName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormExercises((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, exerciseName: val } : item))
                          );
                        }}
                        placeholder="Exercise name (e.g. Flat Dumbbell Press)"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-zinc-500"
                      />

                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-0.5">Sets</span>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={ex.targetSets}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setFormExercises((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, targetSets: val } : item))
                              );
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1 text-xs text-center text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-0.5">Reps</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={ex.targetReps}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setFormExercises((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, targetReps: val } : item))
                              );
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1 text-xs text-center text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-0.5">
                            Target {ex.unit}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="2.5"
                            value={ex.targetWeight}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setFormExercises((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, targetWeight: val } : item))
                              );
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1 text-xs text-center text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-0.5">Rest (sec)</span>
                          <input
                            type="number"
                            min="15"
                            step="15"
                            value={ex.restSeconds}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 60;
                              setFormExercises((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, restSeconds: val } : item))
                              );
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1 text-xs text-center text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs shadow-md transition-all cursor-pointer"
              >
                Save Routine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4-Tab Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
