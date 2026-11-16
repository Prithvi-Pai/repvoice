'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Brain,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  Volume2,
  Mic,
  Dumbbell,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { MuscleGroup } from '@/types';
import {
  getCustomExerciseMuscles,
  saveCustomExerciseMuscle,
  deleteCustomExerciseMuscle,
  MUSCLE_GROUPS_LIST,
  MUSCLE_GROUP_LABELS,
} from '@/lib/exercises/muscleGroupStore';
import {
  getLocalCustomAliases,
  saveLearnedAlias,
  deleteLearnedAlias,
  toTitleCase,
} from '@/lib/exercises/exerciseStore';

export function ContinuousLearningSection() {
  const [customMuscles, setCustomMuscles] = useState<Record<string, MuscleGroup>>({});
  const [customAliases, setCustomAliases] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'muscles' | 'aliases'>('muscles');

  // New Custom Muscle Form State
  const [newExName, setNewExName] = useState('');
  const [newExGroup, setNewExGroup] = useState<MuscleGroup>('chest');
  const [isAddingMuscle, setIsAddingMuscle] = useState(false);

  // New Voice Alias Form State
  const [newSpokenPhrase, setNewSpokenPhrase] = useState('');
  const [newCanonicalTarget, setNewCanonicalTarget] = useState('');
  const [isAddingAlias, setIsAddingAlias] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const reloadData = () => {
    setCustomMuscles(getCustomExerciseMuscles());
    setCustomAliases(getLocalCustomAliases());
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleSaveMuscle = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newExName.trim();
    if (!cleanName) return;

    await saveCustomExerciseMuscle(cleanName, newExGroup);
    setNewExName('');
    setIsAddingMuscle(false);
    reloadData();
    setFeedbackMsg(`Learned: "${toTitleCase(cleanName)}" mapped to ${MUSCLE_GROUP_LABELS[newExGroup]}.`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleDeleteMuscle = (exerciseName: string) => {
    deleteCustomExerciseMuscle(exerciseName);
    reloadData();
    setFeedbackMsg(`Reset custom classification for "${exerciseName}".`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleUpdateMuscleGroup = async (exerciseName: string, group: MuscleGroup) => {
    await saveCustomExerciseMuscle(exerciseName, group);
    reloadData();
    setFeedbackMsg(`Updated "${exerciseName}" to ${MUSCLE_GROUP_LABELS[group]}.`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleSaveAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    const phrase = newSpokenPhrase.trim();
    const target = newCanonicalTarget.trim();
    if (!phrase || !target) return;

    await saveLearnedAlias(phrase, target);
    setNewSpokenPhrase('');
    setNewCanonicalTarget('');
    setIsAddingAlias(false);
    reloadData();
    setFeedbackMsg(`Learned voice alias: "${phrase}" → "${toTitleCase(target)}".`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleDeleteAlias = async (spokenPhrase: string) => {
    await deleteLearnedAlias(spokenPhrase);
    reloadData();
    setFeedbackMsg(`Removed voice alias "${spokenPhrase}".`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const muscleEntries = Object.entries(customMuscles);
  const aliasEntries = Object.entries(customAliases);

  return (
    <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-4 space-y-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
            Continuous Intelligence
          </span>
          <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
            <Brain className="h-4 w-4 text-white" />
            <span>Muscle Disambiguation & Learning</span>
          </h3>
        </div>

        <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-200 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
          <Sparkles className="h-3 w-3 text-white animate-pulse" />
          <span>Active Learning</span>
        </span>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">
        RepVoice remembers custom movements, pronunciations, and your muscle group classifications. Whenever you log a new exercise name, the engine prompts you and saves the classification permanently.
      </p>

      {/* Metric Bento Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-2xl bg-black border border-zinc-850 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase">Classified</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-black text-white tabular-nums">{muscleEntries.length}</span>
            <span className="text-[10px] text-zinc-400">Custom</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-black border border-zinc-850 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase">Voice Aliases</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-black text-white tabular-nums">{aliasEntries.length}</span>
            <span className="text-[10px] text-zinc-400">Learned</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-black border border-zinc-850 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase">Sync State</span>
          <div className="mt-1 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-200" />
            <span className="text-xs font-bold text-zinc-200">Cloud Sync</span>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-white shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-black border border-zinc-850 text-xs font-bold">
        <button
          onClick={() => setActiveTab('muscles')}
          className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'muscles' ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Dumbbell className="h-3.5 w-3.5" />
          <span>Muscle Classifications ({muscleEntries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('aliases')}
          className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'aliases' ? 'bg-white text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Mic className="h-3.5 w-3.5" />
          <span>Learned Voice Aliases ({aliasEntries.length})</span>
        </button>
      </div>

      {/* Tab 1: Muscle Classifications */}
      {activeTab === 'muscles' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">Classified Custom Movements</span>
            <button
              onClick={() => setIsAddingMuscle(!isAddingMuscle)}
              className="text-xs font-bold text-white hover:text-zinc-300 flex items-center gap-1 bg-zinc-900 hover:bg-zinc-850 px-2.5 py-1 rounded-lg border border-zinc-800 transition cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>{isAddingMuscle ? 'Cancel' : 'Teach Exercise'}</span>
            </button>
          </div>

          {/* Add Muscle Form */}
          {isAddingMuscle && (
            <form onSubmit={handleSaveMuscle} className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                  Exercise Name
                </label>
                <input
                  type="text"
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  placeholder="e.g. Incline Double Press or Hack Squats"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                  Target Muscle Group
                </label>
                <select
                  value={newExGroup}
                  onChange={(e) => setNewExGroup(e.target.value as MuscleGroup)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                >
                  {MUSCLE_GROUPS_LIST.map((mg) => (
                    <option key={mg} value={mg}>
                      {MUSCLE_GROUP_LABELS[mg]}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!newExName.trim()}
                className="w-full py-2 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-zinc-200 disabled:opacity-40 transition cursor-pointer"
              >
                Save & Remember Classification
              </button>
            </form>
          )}

          {/* Entries List */}
          {muscleEntries.length === 0 ? (
            <div className="p-6 rounded-2xl bg-black border border-zinc-850 text-center space-y-2">
              <Dumbbell className="h-6 w-6 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">
                No custom exercises classified yet. When you speak or log custom exercise names, RepVoice prompts you and lists them here.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {muscleEntries.map(([name, group]) => (
                <div
                  key={name}
                  className="p-2.5 rounded-xl bg-black border border-zinc-850 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-white capitalize block truncate">{name}</span>
                    <span className="text-[10px] text-zinc-500 block">Classified via RepVoice continuous engine</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={group}
                      onChange={(e) => handleUpdateMuscleGroup(name, e.target.value as MuscleGroup)}
                      className="bg-zinc-900 border border-zinc-800 text-[11px] font-semibold text-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-white"
                    >
                      {MUSCLE_GROUPS_LIST.map((mg) => (
                        <option key={mg} value={mg}>
                          {MUSCLE_GROUP_LABELS[mg]}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleDeleteMuscle(name)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition cursor-pointer"
                      title="Delete classification"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Learned Voice Aliases */}
      {activeTab === 'aliases' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">Custom Voice Pronunciations & Aliases</span>
            <button
              onClick={() => setIsAddingAlias(!isAddingAlias)}
              className="text-xs font-bold text-white hover:text-zinc-300 flex items-center gap-1 bg-zinc-900 hover:bg-zinc-850 px-2.5 py-1 rounded-lg border border-zinc-800 transition cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>{isAddingAlias ? 'Cancel' : 'Teach Voice Alias'}</span>
            </button>
          </div>

          {/* Add Alias Form */}
          {isAddingAlias && (
            <form onSubmit={handleSaveAlias} className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                  Spoken Phrase or Nickname
                </label>
                <input
                  type="text"
                  value={newSpokenPhrase}
                  onChange={(e) => setNewSpokenPhrase(e.target.value)}
                  placeholder="e.g. flat press or incline bells"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                  Interpreted Exercise (Canonical Name)
                </label>
                <input
                  type="text"
                  value={newCanonicalTarget}
                  onChange={(e) => setNewCanonicalTarget(e.target.value)}
                  placeholder="e.g. Bench Press"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!newSpokenPhrase.trim() || !newCanonicalTarget.trim()}
                className="w-full py-2 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-zinc-200 disabled:opacity-40 transition cursor-pointer"
              >
                Save & Remember Voice Alias
              </button>
            </form>
          )}

          {/* Aliases List */}
          {aliasEntries.length === 0 ? (
            <div className="p-6 rounded-2xl bg-black border border-zinc-850 text-center space-y-2">
              <Mic className="h-6 w-6 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">
                No custom voice aliases learned yet. When you correct an exercise during a session or rename an exercise, RepVoice learns your pronunciation automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {aliasEntries.map(([phrase, canonical]) => (
                <div
                  key={phrase}
                  className="p-2.5 rounded-xl bg-black border border-zinc-850 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-300 italic truncate">&quot;{phrase}&quot;</span>
                      <span className="text-[10px] text-zinc-500">→</span>
                      <span className="text-xs font-extrabold text-white truncate">{canonical}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">Hands-free voice recognition alias</span>
                  </div>

                  <button
                    onClick={() => handleDeleteAlias(phrase)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition cursor-pointer"
                    title="Delete alias"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
