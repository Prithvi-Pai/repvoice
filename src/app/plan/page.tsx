'use client';

import { useState, useEffect } from 'react';
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
  ChevronRight,
  ShieldCheck,
  Sparkles,
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

export default function PlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);

  // Form State for Plan Modal
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formScheduledDay, setFormScheduledDay] = useState('Tomorrow');
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
      setPlans(res.plans);
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
      setFormScheduledDay(planToEdit.scheduledDay || 'Tomorrow');
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
      setFormScheduledDay('Tomorrow');
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

    const planToSave: WorkoutPlan = {
      id: editingPlan ? editingPlan.id : `plan_${Date.now()}`,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      scheduledDay: formScheduledDay.trim(),
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

  return (
    <div className="min-h-screen bg-[#111317] text-[#e2e2e8] pb-28 pt-4 px-4 font-sans selection:bg-[#c8f322] selection:text-black">
      {/* Top Header */}
      <header className="max-w-md mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#c8f322]/10 border border-[#c8f322]/30 flex items-center justify-center text-[#c8f322]">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#aed500]">
                Custom Routine Builder
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Workout Plans</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1e2024] border border-white/5 text-xs text-[#c8f322] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>100% Free Split</span>
          </div>
        </div>

        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
          Build plans with total freedom. No rigid splits or forced templates — you decide every exercise, rep target, and rest interval.
        </p>

        {/* CTA: + Plan Your Workout */}
        <button
          onClick={() => handleOpenCreateModal()}
          className="w-full mt-4 min-h-[48px] bg-[#c8f322] hover:bg-[#b8e21a] text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(200,243,34,0.25)] transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          <span>+ Plan Your Workout</span>
        </button>
      </header>

      {/* Routine Cards List */}
      <main className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-zinc-300">Upcoming Routines</h2>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-[#c8f322]">
            {plans.length} Available
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-zinc-500 text-xs animate-pulse">
            Loading workout routines...
          </div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#1e2024]/60 border border-white/5">
            <Dumbbell className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white">No plans created yet</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Tap the button above to build your first tailored training plan.
            </p>
          </div>
        ) : (
          plans.map((plan) => {
            const totalSets = plan.exercises.reduce((sum, e) => sum + (e.targetSets || 0), 0);
            return (
              <div
                key={plan.id}
                className="rounded-2xl bg-[#1a1c22] border border-white/5 p-4 shadow-lg hover:border-white/10 transition-all"
              >
                {/* Plan Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded bg-[#c8f322]/15 text-[#c8f322] inline-block mb-1">
                      {plan.scheduledDay || 'Anytime'}
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                      {plan.title}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-800/80 px-2 py-1 rounded-lg flex items-center gap-1 flex-shrink-0">
                    <Dumbbell className="w-3 h-3 text-[#c8f322]" />
                    {totalSets} sets
                  </span>
                </div>

                {/* Exercises list preview */}
                <div className="bg-[#111317]/70 rounded-xl p-2.5 my-3 border border-white/5">
                  <span className="text-[11px] font-bold text-[#818CF8] uppercase tracking-wider block mb-1">
                    {plan.exercises.length} Exercises:
                  </span>
                  <div className="space-y-1">
                    {plan.exercises.map((ex, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-zinc-300 flex items-center justify-between"
                      >
                        <span className="truncate pr-2 font-medium">
                          • {ex.exerciseName}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono flex-shrink-0">
                          {ex.targetSets} × {ex.targetReps}
                          {ex.targetWeight ? ` @ ${ex.targetWeight}${ex.unit}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-12 gap-2 pt-1">
                  <button
                    onClick={() => handleStartWorkout(plan)}
                    className="col-span-8 min-h-[42px] bg-[#c8f322] hover:bg-[#b8e21a] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-[0_2px_10px_rgba(200,243,34,0.2)] active:scale-[0.98] transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Start Workout</span>
                  </button>
                  <button
                    onClick={() => handleOpenCreateModal(plan)}
                    className="col-span-2 min-h-[42px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs flex items-center justify-center transition-all"
                    title="Edit Plan"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id, plan.title)}
                    className="col-span-2 min-h-[42px] bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 rounded-xl text-xs flex items-center justify-center transition-all"
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

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-[#1a1c22] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#c8f322]" />
                {editingPlan ? 'Edit Workout Plan' : 'Create Custom Routine'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
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
                  className="w-full bg-[#111317] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c8f322]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Scheduled Day
                  </label>
                  <input
                    type="text"
                    value={formScheduledDay}
                    onChange={(e) => setFormScheduledDay(e.target.value)}
                    placeholder="e.g. Tomorrow, or Monday"
                    className="w-full bg-[#111317] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c8f322]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Chest & Triceps focus"
                    className="w-full bg-[#111317] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c8f322]"
                  />
                </div>
              </div>

              {/* Exercises List Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Planned Exercises ({formExercises.length})
                  </label>
                  <button
                    onClick={handleAddExerciseRow}
                    className="text-xs font-bold text-[#c8f322] flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Exercise
                  </button>
                </div>

                <div className="space-y-3">
                  {formExercises.map((ex, idx) => (
                    <div
                      key={ex.id || idx}
                      className="bg-[#111317] border border-white/5 rounded-xl p-3 relative group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-zinc-400">
                          #{idx + 1} Movement
                        </span>
                        {formExercises.length > 1 && (
                          <button
                            onClick={() => handleRemoveExerciseRow(idx)}
                            className="text-zinc-500 hover:text-red-400 text-xs p-1"
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
                        className="w-full bg-[#1a1c22] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-[#c8f322]"
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
                            className="w-full bg-[#1a1c22] border border-white/10 rounded-lg py-1 text-xs text-center text-white"
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
                            className="w-full bg-[#1a1c22] border border-white/10 rounded-lg py-1 text-xs text-center text-white"
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
                            className="w-full bg-[#1a1c22] border border-white/10 rounded-lg py-1 text-xs text-center text-white"
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
                            className="w-full bg-[#1a1c22] border border-white/10 rounded-lg py-1 text-xs text-center text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                className="flex-1 py-2.5 rounded-xl bg-[#c8f322] text-black font-bold text-xs hover:bg-[#b8e21a] shadow-md transition-all"
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
